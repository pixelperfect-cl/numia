
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEntitySubscriptions } from '@/lib/firebase/database';
import { fetchIndicators } from '@/lib/indicators';

export function useSubscriptionMetrics(selectedEntityId: string) {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        monthlyTotal: 0,
        yearlyTotal: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            if (!user || !selectedEntityId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Fetch Data
                const [subscriptions, indicators] = await Promise.all([
                    getEntitySubscriptions(selectedEntityId),
                    fetchIndicators()
                ]);

                const ufValue = indicators.uf?.valor || 0;

                const activeSubs = subscriptions.filter(s => s.status === 'active');

                const monthlyTotal = activeSubs.reduce((acc, sub) => {
                    const amountInClp = sub.currency === 'UF' ? sub.amount * ufValue : sub.amount;
                    if (sub.billingCycle === 'monthly') {
                        return acc + amountInClp;
                    } else {
                        return acc + (amountInClp / 12);
                    }
                }, 0);

                const yearlyTotal = monthlyTotal * 12;

                setStats({
                    monthlyTotal,
                    yearlyTotal
                });

            } catch (error) {
                console.error("Error loading subscription metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadMetrics();
    }, [user, selectedEntityId]);

    return { ...stats, loading };
}
