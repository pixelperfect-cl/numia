import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { getClients, getProjects, getSubscriptions } from '@/lib/supabase/database';
import { Users, Briefcase, DollarSign, Activity, CalendarDays, Plus, Edit2, CheckCircle2 } from 'lucide-react';
import { fetchIndicators } from '@/lib/indicators';
import { formatCurrency } from '@/lib/utils';
import { parseISO, subMonths, subYears, isAfter, differenceInDays, getMonth, addMonths, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Client, Project, Subscription } from '@/types';

interface MaturityItem {
    id: string;
    name: string;
    clientName: string;
    amount: number;
    date: Date;
    currency: 'CLP' | 'UF';
    originalAmount: number;
}

interface ActivityItem {
    id: string;
    type: 'payment' | 'client_created' | 'client_updated' | 'project_created' | 'project_updated' | 'subscription_created' | 'subscription_updated';
    title: string;
    description: string;
    date: Date;
    amount?: number;
    currency?: 'CLP' | 'UF';
    icon: any;
    colorClass: string;
}

export interface ERPDashboardProps {
    entityId?: string;
}

export function ERPDashboard({ entityId }: ERPDashboardProps) {
    const { user } = useAuth();
    const { isBalanceHidden } = usePrivacy();
    const [loading, setLoading] = useState(true);
    const [ufValue, setUfValue] = useState<number | null>(null);
    const [metrics, setMetrics] = useState({
        mrr: 0,
        activeClients: 0,
        activeProjects: 0,
        totalProjects: 0,
        totalActiveProjectValue: 0,
        pendingCollections: 0,
        breakdown: {
            monthlyServicesMonthlyAmount: 0,
            monthlyServicesAnnualAmount: 0,
            annualServicesAnnualAmount: 0,
            annualServicesMonthlyAmount: 0
        }
    });
    const [upcomingMaturities, setUpcomingMaturities] = useState<{
        annual: MaturityItem[];
        monthly: MaturityItem[];
    }>({ annual: [], monthly: [] });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user, entityId]);

    const loadDashboardData = async () => {
        try {
            if (!user) return;
            setLoading(true);

            const [clientsData, projectsData, indicatorsData] = await Promise.all([
                getClients(user.uid),
                getProjects(user.uid),
                fetchIndicators()
            ]);

            const currentUf = indicatorsData.uf?.valor || null;
            setUfValue(currentUf);

            // Calculate Active Clients (Status = active)
            // Filter by entityId if provided
            const filteredClients = entityId
                ? clientsData.filter(c => c.entityId === entityId)
                : clientsData;

            const activeClientsCount = filteredClients.filter(c => c.status === 'active').length;

            // Calculate Active Projects (Not completed AND Not archived)
            // Filter by entityId if provided
            const filteredProjects = entityId
                ? projectsData.filter(p => p.entityId === entityId)
                : projectsData;

            let activeProjectsCount = 0;
            let totalActiveProjectValue = 0;

            filteredProjects.forEach(p => {
                if (p.status !== 'completed' && !p.archived) {
                    activeProjectsCount++;
                    let amount = p.amount || 0;
                    if (p.currency === 'UF' && currentUf) {
                        amount = amount * currentUf;
                    }
                    totalActiveProjectValue += amount;
                }
            });

            const totalProjectsCount = filteredProjects.filter(p => !p.archived).length;

            // Calculate MRR & Pending Collections & Maturities & Activity
            let totalMrr = 0;
            let totalPending = 0;
            let monthlyServicesMonthlyAmount = 0;
            let annualServicesAnnualAmount = 0;
            const annualMaturities: MaturityItem[] = [];
            const monthlyMaturities: MaturityItem[] = [];
            const allActivity: ActivityItem[] = [];

            const nextMonthIndex = (new Date().getMonth() + 1) % 12;

            await Promise.all(filteredClients.map(async (client) => {
                const subs = await getSubscriptions(client.id, user.uid);

                subs.forEach(sub => {
                    // MRR Calculation
                    let amount = Number(sub.amount) || 0;
                    if (sub.currency === 'UF' && currentUf) {
                        amount = amount * currentUf;
                    }

                    if (sub.status === 'active') {
                        if (sub.frequency === 'yearly') {
                            annualServicesAnnualAmount += amount;
                            totalMrr += amount / 12;
                        } else {
                            monthlyServicesMonthlyAmount += amount;
                            totalMrr += amount;
                        }

                        // Maturity Logic
                        const billingDate = parseISO(sub.nextBillingDate);
                        const item: MaturityItem = {
                            id: sub.id,
                            name: sub.name,
                            clientName: client.name,
                            amount: amount,
                            date: billingDate,
                            currency: sub.currency || 'CLP',
                            originalAmount: Number(sub.amount)
                        };

                        if (sub.frequency === 'yearly') {
                            // Annual: Only if due NEXT month
                            if (getMonth(billingDate) === nextMonthIndex) {
                                annualMaturities.push(item);
                            }
                        } else {
                            // Monthly: All active
                            monthlyMaturities.push(item);
                        }

                        // Pending Collections Calculation
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

                            let targetAmount = sub.amount;
                            if (sub.currency === 'UF' && currentUf) {
                                targetAmount = Math.round(sub.amount * currentUf);
                            }

                            const remaining = Math.max(0, targetAmount - paidAmount);
                            const daysUntilDue = differenceInDays(nextDate, today);

                            if (remaining > 10 && (daysUntilDue <= 7)) {
                                totalPending += remaining;
                            }
                        }
                    }

                    // Activity: Payments
                    if (sub.payments && sub.payments.length > 0) {
                        sub.payments.forEach((p, idx) => {
                            // Assuming payment ID is needed, if missing generate one
                            const pid = p.id || `pay-${sub.id}-${idx}`;
                            allActivity.push({
                                id: pid,
                                type: 'payment',
                                title: 'Pago Registrado',
                                description: `${client.name} - ${sub.name}`,
                                amount: p.amount,
                                date: parseISO(p.date),
                                icon: DollarSign,
                                colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30"
                            });
                        });
                    }
                });
            }));

            // Sort Activity by date desc
            allActivity.sort((a, b) => b.date.getTime() - a.date.getTime());
            setRecentActivity(allActivity.slice(0, 20)); // Return top 20 events

            setMetrics({
                mrr: totalMrr,
                activeClients: activeClientsCount,
                activeProjects: activeProjectsCount,
                totalProjects: totalProjectsCount,
                totalActiveProjectValue,
                pendingCollections: totalPending,
                breakdown: {
                    monthlyServicesMonthlyAmount,
                    monthlyServicesAnnualAmount: monthlyServicesMonthlyAmount * 12,
                    annualServicesAnnualAmount,
                    annualServicesMonthlyAmount: annualServicesAnnualAmount / 12
                }
            });

            // Sort maturities by date
            annualMaturities.sort((a, b) => a.date.getTime() - b.date.getTime());
            monthlyMaturities.sort((a, b) => a.date.getTime() - b.date.getTime());

            setUpcomingMaturities({
                annual: annualMaturities,
                monthly: monthlyMaturities
            });

        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        {
            title: "MRR Estimado",
            value: formatCurrency(metrics.mrr),
            description: "Ingresos recurrentes mensuales",
            icon: DollarSign,
            className: "text-emerald-500"
        },
        {
            title: "Clientes Activos",
            value: metrics.activeClients,
            description: "En cartera",
            icon: Users,
            className: "text-blue-500"
        },
        {
            title: "Proyectos en Curso",
            value: metrics.activeProjects,
            description: `De ${metrics.totalProjects} totales`,
            icon: Briefcase,
            className: "text-amber-500"
        },
        {
            title: "Cobros Pendientes",
            value: formatCurrency(metrics.pendingCollections),
            description: "Próximos 7 días",
            icon: Activity,
            className: "text-purple-500"
        }
    ];

    const formatMaturityAmount = (item: MaturityItem) => {
        if (isBalanceHidden) return '****';
        if (item.currency === 'UF') {
            return `UF ${item.originalAmount} `;
        }
        return formatCurrency(item.amount);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
                <p className="text-muted-foreground">Resumen general de tu agencia</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
                            <card.icon className={`h-4 w-4 ${card.className} `} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? "..." : (index === 0 || index === 3) && isBalanceHidden ? '****' : card.value}
                            </div>

                            {/* Detailed Breakdown for MRR Card (Index 0) */}
                            {index === 0 && !loading && !isBalanceHidden && (
                                <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Servicios Mensuales:</span>
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.breakdown.monthlyServicesMonthlyAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Servicios Anuales (Prom):</span>
                                        <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(metrics.breakdown.annualServicesMonthlyAmount)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Project Value Breakdown (Index 2) */}
                            {index === 2 && !loading && !isBalanceHidden && metrics.totalActiveProjectValue > 0 && (
                                <div className="mt-2 text-xs font-medium text-muted-foreground border-t border-border/50 pt-2 flex justify-between items-center">
                                    <span>Valor Total:</span>
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(metrics.totalActiveProjectValue)}</span>
                                </div>
                            )}

                            {index !== 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {card.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Placeholder for future charts or lists */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Cargando actividad...</p>
                        ) : recentActivity.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay actividad reciente registrada.</p>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {recentActivity.map((activity, i) => (
                                    <div key={activity.id || i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${activity.colorClass}`}>
                                                <activity.icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{activity.title}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {activity.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {activity.amount !== undefined && (
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    +{isBalanceHidden ? '****' : formatCurrency(activity.amount)}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {format(activity.date, "d MMM", { locale: es })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-zinc-500" />
                            Próximos Vencimientos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Cargando...</p>
                        ) : (upcomingMaturities.annual.length === 0 && upcomingMaturities.monthly.length === 0) ? (
                            <p className="text-sm text-muted-foreground">No hay vencimientos próximos.</p>
                        ) : (
                            <>
                                {/* Initial Annual Block */}
                                {upcomingMaturities.annual.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                            Anuales (Próximo Mes)
                                        </h4>
                                        <div className="space-y-2">
                                            {upcomingMaturities.annual.map((item) => (
                                                <div key={item.id} className="flex justify-between items-center text-sm border-l-2 border-blue-200 pl-3 py-1">
                                                    <div>
                                                        <div className="font-medium text-zinc-800 dark:text-zinc-200">{item.clientName}</div>
                                                        <div className="text-xs text-zinc-500">{item.name}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold">{formatMaturityAmount(item)}</div>
                                                        <div className="text-xs text-zinc-500">{format(item.date, "d MMM", { locale: es })}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Monthly Block */}
                                {upcomingMaturities.monthly.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Mensuales
                                        </h4>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                            {upcomingMaturities.monthly.map((item) => (
                                                <div key={item.id} className="flex justify-between items-center text-sm border-l-2 border-emerald-200 pl-3 py-1">
                                                    <div>
                                                        <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">{item.clientName}</div>
                                                        <div className="text-xs text-zinc-500 truncate max-w-[150px]">{item.name}</div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="font-semibold">{formatMaturityAmount(item)}</div>
                                                        <div className="text-xs text-zinc-500">{format(item.date, "d MMM", { locale: es })}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
