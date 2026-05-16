import {
    getClients,
    getSubscriptions,
    createMovement,
    updateSubscription,
    getEntities,
    getCategories,
    findMovementBySubscriptionPeriod,
} from '../supabase/database';
import { format } from 'date-fns';
import { addPeriodToDateString, parseLocalDateString, getTodayLocalDateString } from '@/lib/utils';

export interface BillingRunResult {
    created: number;
    skippedDuplicate: number;
    skippedZombie: number;
    failed: number;
    failures: Array<{ subscriptionId: string; error: string }>;
}

async function fetchUfRate(): Promise<number | null> {
    try {
        const resp = await fetch('https://mindicador.cl/api/uf');
        if (!resp.ok) return null;
        const json = await resp.json();
        const value = json?.serie?.[0]?.valor;
        return typeof value === 'number' ? value : null;
    } catch {
        return null;
    }
}

export async function checkAndGenerateSubscriptionMovements(userId: string): Promise<BillingRunResult> {
    const result: BillingRunResult = {
        created: 0,
        skippedDuplicate: 0,
        skippedZombie: 0,
        failed: 0,
        failures: [],
    };

    const [entities, categories, clients] = await Promise.all([
        getEntities(userId),
        getCategories(userId),
        getClients(userId),
    ]);

    if (entities.length === 0 || categories.length === 0) {
        console.warn('billing: no entities or categories — skipping run');
        return result;
    }

    const entitiesById = new Map(entities.map((e) => [e.id, e]));
    const fallbackEntity = entities[0];

    const incomeCategory =
        categories.find((c) => c.type === 'income' && c.name.toLowerCase().includes('servicios')) ||
        categories.find((c) => c.type === 'income');

    if (!incomeCategory) {
        console.warn('billing: no income category — skipping run');
        return result;
    }

    const today = parseLocalDateString(getTodayLocalDateString());
    let ufRate: number | null = null;

    const resolveBoxKey = (entity: typeof fallbackEntity): string => {
        const boxes = entity.boxes ?? {};
        const keys = Object.keys(boxes);
        if (keys.length === 0) return 'general';
        return keys.find((k) => boxes[k].isDefault) ?? keys[0];
    };

    for (const client of clients) {
        if (client.status !== 'active') continue;

        const clientEntity = (client.entityId && entitiesById.get(client.entityId)) || fallbackEntity;
        const boxKey = resolveBoxKey(clientEntity);

        const subscriptions = await getSubscriptions(client.id, userId);

        for (const sub of subscriptions) {
            if (sub.status !== 'active') continue;

            if (!sub.nextBillingDate) {
                result.skippedZombie++;
                console.warn(`billing: zombie subscription ${sub.id} (${sub.name}) — active without nextBillingDate`);
                continue;
            }

            const dateToBill = parseLocalDateString(sub.nextBillingDate);
            if (dateToBill > today) continue;

            const billingPeriod = sub.nextBillingDate;

            try {
                const existing = await findMovementBySubscriptionPeriod(userId, sub.id, billingPeriod);
                if (existing) {
                    const nextDateStr = addPeriodToDateString(billingPeriod, sub.frequency, 1);
                    if (sub.nextBillingDate === billingPeriod) {
                        await updateSubscription(sub.id, { nextBillingDate: nextDateStr });
                    }
                    result.skippedDuplicate++;
                    continue;
                }

                let amount = sub.amount;
                let description = `Suscripción: ${sub.name} - ${client.name}`;

                if (sub.currency === 'UF') {
                    if (ufRate == null) ufRate = await fetchUfRate();
                    if (ufRate != null) {
                        amount = Math.round(sub.amount * ufRate);
                        description += ` (${sub.amount} UF @ $${ufRate.toLocaleString('es-CL')})`;
                    } else {
                        console.warn(`billing: UF rate unavailable for ${sub.id} — skipping`);
                        result.failed++;
                        result.failures.push({ subscriptionId: sub.id, error: 'UF rate unavailable' });
                        continue;
                    }
                }

                const nextDateStr = addPeriodToDateString(billingPeriod, sub.frequency, 1);
                await updateSubscription(sub.id, { nextBillingDate: nextDateStr });

                try {
                    await createMovement(userId, {
                        entityId: clientEntity.id,
                        amount,
                        type: 'income',
                        description,
                        categoryId: incomeCategory.id,
                        box: boxKey,
                        date: format(today, 'yyyy-MM-dd'),
                        status: 'pending',
                        clientId: client.id,
                        subscriptionId: sub.id,
                        billingPeriod,
                    });
                    result.created++;
                } catch (movementErr: any) {
                    await updateSubscription(sub.id, { nextBillingDate: billingPeriod }).catch(() => undefined);
                    throw movementErr;
                }
            } catch (err: any) {
                console.error(`billing: failed for subscription ${sub.id}`, err);
                result.failed++;
                result.failures.push({ subscriptionId: sub.id, error: err?.message ?? String(err) });
            }
        }
    }

    return result;
}
