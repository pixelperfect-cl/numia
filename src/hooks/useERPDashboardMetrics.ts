
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClients, getSubscriptions } from '@/lib/supabase/database';
import { fetchIndicators } from '@/lib/indicators';
import { parseISO, subMonths, subYears, isAfter, differenceInDays } from 'date-fns';

export function useERPDashboardMetrics(selectedEntityId: string) {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState({
        mrr: 0,
        activeClients: 0,
        pendingCollections: 0
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
                // Fetch data needed for metrics
                const [clientsData, indicatorsData] = await Promise.all([
                    getClients(user.uid),
                    fetchIndicators()
                ]);

                const currentUf = indicatorsData.uf?.valor || null;
                const activeClientsCount = clientsData.filter(c => c.status === 'active').length;

                let totalMrr = 0;
                let totalPending = 0;

                // Process subscriptions for all active clients
                // Note: ideally we might filter clients by entityId if they belong to entities
                // Assuming clients have entityId or are global to user for now based on previous simple fetch
                // But generally data context is filtered by entityId in UI. 
                // Let's filter clients by selectedEntityId if standard practice, 
                // but getClients fetches ALL user clients. 
                // We should filter:
                const entityClients = clientsData.filter(c => c.entityId === selectedEntityId);
                const activeEntityClientsCount = entityClients.filter(c => c.status === 'active').length;

                await Promise.all(entityClients.map(async (client) => {
                    const subs = await getSubscriptions(client.id, user.uid);

                    subs.forEach(sub => {
                        let amount = Number(sub.amount) || 0;
                        if (sub.currency === 'UF' && currentUf) {
                            amount = amount * currentUf;
                        }

                        if (sub.status === 'active') {
                            if (sub.frequency === 'yearly') {
                                totalMrr += amount / 12;
                            } else {
                                totalMrr += amount;
                            }

                            // Pending Collections Logic (Simplified from Dashboard)
                            if (sub.nextBillingDate) {
                                const nextDate = parseISO(sub.nextBillingDate);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                let periodStart = sub.frequency === 'monthly'
                                    ? subMonths(nextDate, 1)
                                    : subYears(nextDate, 1);

                                const validPayments = (sub.payments || []).filter(p => {
                                    const pDate = parseISO(p.date);
                                    return isAfter(pDate, periodStart) && pDate <= nextDate;
                                });

                                const paidAmount = validPayments.reduce((sum, p) => sum + p.amount, 0);
                                const targetAmount = sub.currency === 'UF' && currentUf
                                    ? Math.round(sub.amount * currentUf)
                                    : sub.amount;

                                const remaining = Math.max(0, targetAmount - paidAmount);
                                const daysUntilDue = differenceInDays(nextDate, today);

                                // Due within 7 days
                                if (remaining > 10 && (daysUntilDue <= 7)) {
                                    totalPending += remaining;
                                }
                            }
                        }
                    });
                }));

                setMetrics({
                    mrr: totalMrr,
                    activeClients: activeEntityClientsCount,
                    pendingCollections: totalPending
                });

            } catch (error) {
                console.error("Error loading ERP dashboard metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadMetrics();
    }, [user, selectedEntityId]);

    return { ...metrics, loading };
}
