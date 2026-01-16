
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClients, getSubscriptions } from '@/lib/firebase/database';
import { fetchIndicators } from '@/lib/indicators';
import { Subscription, Client, EnhancedSubscription } from '@/types';
import { format, subMonths, subYears, parseISO, isAfter } from 'date-fns';

export function useServiceMetrics(selectedEntityId: string) {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        monthlyAverage: 0,
        totalAnnual: 0
    });
    const [loading, setLoading] = useState(true);

    // Logic duplicated from Services.tsx to process subscription status/payments
    const processSubscription = (sub: Subscription, client: Client, userId: string): EnhancedSubscription => {
        const nextDate = parseISO(sub.nextBillingDate);
        let periodStart = sub.frequency === 'monthly'
            ? subMonths(nextDate, 1)
            : subYears(nextDate, 1);

        const currentPayments = (sub.payments || []).filter(p => {
            const pDate = parseISO(p.date);
            return isAfter(pDate, periodStart) && pDate <= parseISO(sub.nextBillingDate);
        });

        const paid = currentPayments.reduce((sum, p) => sum + p.amount, 0);

        return {
            ...sub,
            clientName: client.name,
            clientWebsite: client.website,
            clientId: client.id,
            paidAmount: paid,
        };
    };

    useEffect(() => {
        const loadMetrics = async () => {
            if (!user || !selectedEntityId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // 1. Fetch UF
                const indicatorsData = await fetchIndicators();
                const ufValue = indicatorsData.uf?.valor || 0;

                // 2. Fetch Clients for this Entity
                const allClients = await getClients(user.uid);
                const entityClients = allClients.filter(c => c.entityId === selectedEntityId);

                // 3. Fetch Subscriptions
                const subsPromises = entityClients.map(async (client) => {
                    const clientSubs = await getSubscriptions(client.id, user.uid);
                    return clientSubs.map(sub => processSubscription(sub, client, user.uid));
                });

                const results = await Promise.all(subsPromises);
                const subscriptions = results.flat();

                // 4. Calculate Stats
                const activeSubs = subscriptions.filter(s => s.status === 'active');

                const totalAnnual = activeSubs.reduce((acc, curr) => {
                    const amountInClp = curr.currency === 'UF' && ufValue ? curr.amount * ufValue : curr.amount;
                    if (curr.frequency === 'monthly') {
                        return acc + (amountInClp * 12);
                    } else {
                        return acc + amountInClp;
                    }
                }, 0);

                const monthlyAverage = totalAnnual / 12;

                setStats({
                    monthlyAverage,
                    totalAnnual
                });

            } catch (error) {
                console.error("Error loading service metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadMetrics();
    }, [user, selectedEntityId]);

    return { ...stats, loading };
}
