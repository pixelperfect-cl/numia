
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Subscription } from '@/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Zap, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface DashboardSidebarProps {
    subscriptions: Subscription[];
    isBalanceHidden?: boolean;
    onCreateService?: () => void;
}

export function DashboardSidebar({ subscriptions, isBalanceHidden = false, onCreateService }: DashboardSidebarProps) {
    // Top 3 services by value
    const topServices = useMemo(() => {
        return [...subscriptions]
            .filter(s => s.status === 'active')
            .sort((a, b) => {
                const aValue = a.frequency === 'monthly' ? a.amount * 12 : a.amount;
                const bValue = b.frequency === 'monthly' ? b.amount * 12 : b.amount;
                return bValue - aValue;
            })
            .slice(0, 3);
    }, [subscriptions]);

    // Upcoming bills (next 30 days)
    const upcomingBills = useMemo(() => {
        const now = new Date();
        return subscriptions
            .filter(s => {
                if (s.status !== 'active') return false;
                const nextDate = parseISO(s.nextBillingDate);
                const daysUntil = differenceInDays(nextDate, now);
                return daysUntil >= 0 && daysUntil <= 30;
            })
            .sort((a, b) => {
                const dateA = parseISO(a.nextBillingDate);
                const dateB = parseISO(b.nextBillingDate);
                return dateA.getTime() - dateB.getTime();
            })
            .slice(0, 5);
    }, [subscriptions]);

    // Calculate active services percentage (of total including inactive)
    const activePercentage = useMemo(() => {
        const total = subscriptions.length;
        if (total === 0) return 0;
        const active = subscriptions.filter(s => s.status === 'active').length;
        return Math.round((active / total) * 100);
    }, [subscriptions]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="bg-card/40 backdrop-blur-sm border-white/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-cyan-400" />
                        Panel de Contexto
                    </CardTitle>
                </CardHeader>
            </Card>

            {/* Circular Progress - Active Services */}
            <Card className="bg-card/40 backdrop-blur-sm border-white/10">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                        <div className="relative w-32 h-32 mb-4">
                            {/* Background circle */}
                            <svg className="transform -rotate-90 w-32 h-32">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-muted/20"
                                />
                                {/* Progress circle */}
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={`${2 * Math.PI * 56}`}
                                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - activePercentage / 100)}`}
                                    className="text-cyan-400 transition-all duration-1000"
                                    strokeLinecap="round"
                                />
                            </svg>
                            {/* Center text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-foreground">{activePercentage}%</span>
                                <span className="text-[10px] text-muted-foreground uppercase">Servicios</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            {subscriptions.filter(s => s.status === 'active').length} de {subscriptions.length} activos
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Top Services */}
            <Card className="bg-card/40 backdrop-blur-sm border-white/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Servicios Destacados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {topServices.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No hay servicios activos</p>
                    ) : (
                        topServices.map((service, idx) => {
                            const annualValue = service.frequency === 'monthly' ? service.amount * 12 : service.amount;
                            return (
                                <div key={service.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-cyan-400">#{idx + 1}</span>
                                            <p className="text-xs font-medium text-foreground truncate">{service.name}</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {service.frequency === 'monthly' ? 'Mensual' : 'Anual'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-cyan-400">
                                            {isBalanceHidden ? '****' : formatCurrency(annualValue)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">ARR</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>

            {/* Upcoming Bills */}
            <Card className="bg-card/40 backdrop-blur-sm border-white/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-cyan-400" />
                        Próximos Vencimientos
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {upcomingBills.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Sin vencimientos próximos</p>
                    ) : (
                        upcomingBills.map(bill => {
                            const nextDate = parseISO(bill.nextBillingDate);
                            const daysUntil = differenceInDays(nextDate, new Date());
                            const isUrgent = daysUntil <= 7;

                            return (
                                <div key={bill.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">{bill.name}</p>
                                        <p className="text-[10px] text-muted-foreground capitalize">
                                            {format(nextDate, 'dd MMM', { locale: es })}
                                        </p>
                                    </div>
                                    <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-[10px] h-5">
                                        {daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                                    </Badge>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-2">
                <Button
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    onClick={onCreateService}
                >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Nuevo Servicio
                </Button>
            </div>
        </div>
    );
}
