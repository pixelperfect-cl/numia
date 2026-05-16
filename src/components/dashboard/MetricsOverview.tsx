
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, DollarSign, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Subscription } from '@/types';
import { useIndicators } from '@/hooks/useIndicators';
import { useMemo } from 'react';
import { MetricChartCard } from '@/components/dashboard/MetricChartCard';
import { subMonths, startOfMonth, parseISO } from 'date-fns';

interface MetricsOverviewProps {
    balance: number;
    balanceChange: number; // Percentage
    monthlyRevenue: number;
    revenueChange: number;
    monthlyExpenses: number;
    expensesChange: number;
    arr: number; // Annual Recurring Revenue
    arrChange: number;
    pendingCollections: number;
    overdueAmount: number;
    isBalanceHidden?: boolean;
    subscriptions: Subscription[];
}

interface MetricCardProps {
    title: string;
    value: string;
    change: number;
    icon: React.ReactNode;
    positive?: boolean;
    variant?: 'default' | 'warn' | 'danger';
    subtitle?: string;
}

function MetricCard({ title, value, change, icon, positive = true, variant = 'default', subtitle }: MetricCardProps) {
    const isPositive = change >= 0;
    const showChange = change !== 0;

    const variantStyles = {
        default: 'bg-card/40 border-white/10 hover:border-cyan-500/30',
        warn: 'bg-card/40 border-yellow-500/20 hover:border-yellow-500/40',
        danger: 'bg-card/40 border-red-500/20 hover:border-red-500/40'
    };

    return (
        <div className={cn(
            "relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-300 p-4",
            "hover:bg-card/60 group",
            variantStyles[variant]
        )}>
            {/* Background gradient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
                    <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
                    {subtitle && (
                        <p className="text-xs font-mono text-cyan-400 mb-1">{subtitle}</p>
                    )}
                    {showChange && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-medium",
                            positive
                                ? (isPositive ? "text-emerald-400" : "text-red-400")
                                : (isPositive ? "text-red-400" : "text-emerald-400")
                        )}>
                            {(positive ? isPositive : !isPositive) ? (
                                <TrendingUp className="h-3 w-3" />
                            ) : (
                                <TrendingDown className="h-3 w-3" />
                            )}
                            <span>{Math.abs(change).toFixed(1)}%</span>
                        </div>
                    )}
                </div>
                <div className={cn(
                    "p-3 rounded-lg transition-colors",
                    variant === 'danger' ? "bg-red-500/10 text-red-400" :
                        variant === 'warn' ? "bg-yellow-500/10 text-yellow-400" :
                            "bg-cyan-500/10 text-cyan-400"
                )}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export function MetricsOverview({
    balance,
    balanceChange,
    monthlyRevenue,
    revenueChange,
    monthlyExpenses,
    expensesChange,
    arr,
    arrChange,
    pendingCollections,
    overdueAmount,
    isBalanceHidden = false,
    subscriptions
}: MetricsOverviewProps) {
    const hasOverdue = overdueAmount > 0;
    const { indicators } = useIndicators();
    const ufValue = indicators.find(i => i.codigo === 'uf')?.valor || 39730;

    // Simple count of active services
    const activeServicesCount = useMemo(() => {
        return subscriptions.filter(s => s.status === 'active').length;
    }, [subscriptions]);

    // Total value in UF for display
    const activeServicesValueUF = useMemo(() => {
        const activeSubs = subscriptions.filter(s => s.status === 'active');
        let totalValueUF = 0;

        activeSubs.forEach(sub => {
            const monthlyValue = sub.frequency === 'monthly' ? sub.amount : sub.amount / 12;
            if (sub.currency === 'UF') {
                totalValueUF += monthlyValue;
            } else {
                totalValueUF += (monthlyValue / ufValue);
            }
        });

        return totalValueUF;
    }, [subscriptions, ufValue]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
                title="Balance Actual"
                value={isBalanceHidden ? '****' : formatCurrency(balance)}
                change={balanceChange}
                icon={<Wallet className="h-5 w-5" />}
                positive={true}
            />

            <MetricCard
                title="Ingresos Mes Actual"
                value={isBalanceHidden ? '****' : formatCurrency(monthlyRevenue)}
                change={revenueChange}
                icon={<TrendingUp className="h-5 w-5" />}
                positive={true}
            />

            <MetricCard
                title="Gastos Mes Actual"
                value={isBalanceHidden ? '****' : formatCurrency(monthlyExpenses)}
                change={expensesChange}
                icon={<TrendingDown className="h-5 w-5" />}
                positive={false}
            />

            <MetricCard
                title="ARR Total"
                value={isBalanceHidden ? '****' : formatCurrency(arr)}
                change={arrChange}
                icon={<DollarSign className="h-5 w-5" />}
                positive={true}
            />

            {/* Servicios Activos - with monthly count sparkline */}
            <div className="h-32">
            {(() => {
                // Compute active service count per month for the last 12 months
                const now = new Date();
                const serviceCountHistory = Array.from({ length: 12 }, (_, i) => {
                    const monthDate = startOfMonth(subMonths(now, 11 - i));
                    // Count services that existed (were created) by this month and weren't archived before it
                    const count = subscriptions.filter(sub => {
                        const created = sub.createdAt ? new Date(sub.createdAt) : parseISO(sub.startDate);
                        if (created > monthDate) return false;
                        // If archived before this month, don't count
                        if (sub.status !== 'active' && sub.archivedAt) {
                            const archived = parseISO(sub.archivedAt);
                            if (archived < monthDate) return false;
                        }
                        return true;
                    }).length;
                    return { value: count };
                });
                const prevCount = serviceCountHistory[10]?.value || 0;
                const currentCount = serviceCountHistory[11]?.value || 0;
                const countTrend = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0;

                return (
                    <MetricChartCard
                        label="Servicios Activos"
                        value={`${activeServicesCount}`}
                        subtext={`MRR: UF ${activeServicesValueUF.toFixed(1)}`}
                        data={serviceCountHistory}
                        color="cyan"
                        trend={parseFloat(countTrend.toFixed(1))}
                        trendDirection={countTrend >= 0 ? 'up' : 'down'}
                    />
                );
            })()}
            </div>

            <MetricCard
                title="Cobros Pendientes"
                value={isBalanceHidden ? '****' : formatCurrency(pendingCollections + overdueAmount)}
                change={0}
                icon={<AlertCircle className="h-5 w-5" />}
                variant={hasOverdue ? 'danger' : 'default'}
            />
        </div>
    );
}
