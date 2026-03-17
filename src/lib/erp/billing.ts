import { getClients, getSubscriptions, createMovement, updateSubscription, getEntities, getCategories } from '../supabase/database';
import { isPast, parseISO, format } from 'date-fns';
import { addPeriodToDateString } from '@/lib/utils';

export async function checkAndGenerateSubscriptionMovements(userId: string) {
    let createdCount = 0;

    try {
        // 1. Get necessary context data
        const [entities, categories, clients] = await Promise.all([
            getEntities(userId),
            getCategories(userId),
            getClients(userId)
        ]);

        if (entities.length === 0 || categories.length === 0) {
            console.warn("No entities or categories found for billing generation");
            return { created: 0 };
        }

        const defaultEntity = entities[0];
        const defaultBoxKey = Object.keys(defaultEntity.boxes).find(key => defaultEntity.boxes[key].isDefault) || Object.keys(defaultEntity.boxes)[0];

        // Find a suitable category for subscription income
        const incomeCategory = categories.find(c => c.type === 'income' && c.name.toLowerCase().includes('servicios'))
            || categories.find(c => c.type === 'income');

        if (!incomeCategory) {
            console.warn("No income category found");
            return { created: 0 };
        }

        // 2. Iterate Clients
        for (const client of clients) {
            if (client.status !== 'active') continue;

            const subscriptions = await getSubscriptions(client.id, userId);

            for (const sub of subscriptions) {
                if (sub.status !== 'active' || !sub.nextBillingDate) continue;

                const dateToBill = parseISO(sub.nextBillingDate);

                // Check if billing date is in the past or today
                if (isPast(dateToBill) || format(dateToBill, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {

                    // Create Pending Movement
                    await createMovement(userId, {
                        entityId: defaultEntity.id,
                        amount: sub.amount,
                        type: 'income',
                        description: `Suscripción: ${sub.name} - ${client.name}`,
                        categoryId: incomeCategory.id,
                        box: defaultBoxKey,
                        date: sub.nextBillingDate,
                        status: 'pending',
                        clientId: client.id
                    });

                    createdCount++;

                    // Update Subscription Next Billing Date
                    const nextDateStr = addPeriodToDateString(sub.nextBillingDate, sub.frequency, 1);

                    await updateSubscription(sub.id, {
                        nextBillingDate: nextDateStr
                    });
                }
            }
        }

        return { created: createdCount };

    } catch (error) {
        console.error("Error in billing generation:", error);
        throw error;
    }
}
