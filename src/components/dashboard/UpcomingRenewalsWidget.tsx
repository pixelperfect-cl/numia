import { useMemo } from 'react';
import { Subscription } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { parseISO, differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UpcomingRenewalsWidgetProps {
    subscriptions: Subscription[];
    limit?: number;
}

export function UpcomingRenewalsWidget({ subscriptions, limit = 8 }: UpcomingRenewalsWidgetProps) {
    const upcomingRenewals = useMemo(() => {
        const now = new Date();
        const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        return subscriptions
            .filter(sub => {
                if (sub.status !== 'active' || !sub.nextBillingDate) return false;
                const endDate = parseISO(sub.nextBillingDate);
                return endDate >= now && endDate <= sixtyDaysFromNow;
            })
            .map(sub => {
                const endDate = parseISO(sub.nextBillingDate!);
                const daysUntil = differenceInDays(endDate, now);
                return { ...sub, endDate, daysUntil };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, limit);
    }, [subscriptions, limit]);

    const getUrgencyColor = (days: number) => {
        if (days < 7) return 'text-red-400 bg-red-500/10';
        if (days < 30) return 'text-yellow-400 bg-yellow-500/10';
        return 'text-emerald-400 bg-emerald-500/10';
    };

    const getUrgencyBadge = (days: number) => {
        if (days < 7) return 'Urgente';
        if (days < 30) return 'Próximo';
        return 'Planificado';
    };

    if (upcomingRenewals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Calendar className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No hay renovaciones próximas</p>
                <p className="text-xs mt-1">Todos los servicios están al día</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="space-y-3 p-4">
                {upcomingRenewals.map((renewal) => (
                    <div
                        key={renewal.id}
                        className="group relative bg-card/40 backdrop-blur-sm border border-white/10 rounded-lg p-3 hover:border-cyan-500/30 transition-all"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-medium text-foreground truncate">
                                        {renewal.name}
                                    </h4>
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full font-medium",
                                        getUrgencyColor(renewal.daysUntil)
                                    )}>
                                        {getUrgencyBadge(renewal.daysUntil)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                        {format(renewal.endDate, "d 'de' MMMM, yyyy", { locale: es })}
                                    </span>
                                    <span className="text-cyan-400 font-medium">
                                        ({renewal.daysUntil} {renewal.daysUntil === 1 ? 'día' : 'días'})
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-semibold text-foreground">
                                    {formatCurrency(renewal.amount)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {renewal.currency}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
