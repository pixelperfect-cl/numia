import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Subscription } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface UpcomingRenewalsListProps {
    subscriptions: Subscription[];
    limit?: number;
}

export function UpcomingRenewalsList({ subscriptions, limit = 5 }: UpcomingRenewalsListProps) {
    const upcomingRenewals = useMemo(() => {
        // Filter active subscriptions and sort by next billing date
        return subscriptions
            .filter(sub => sub.status === 'active')
            .sort((a, b) => {
                const dateA = new Date(a.nextBillingDate).getTime();
                const dateB = new Date(b.nextBillingDate).getTime();
                return dateA - dateB;
            })
            .slice(0, limit);
    }, [subscriptions, limit]);

    if (upcomingRenewals.length === 0) {
        return <div className="text-slate-500 text-sm p-4">No hay vencimientos próximos.</div>;
    }

    return (
        <div className="w-full">
            <div className="flex flex-col gap-1">
                {upcomingRenewals.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 px-2 rounded transition-colors group">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                                {sub.name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>{format(new Date(sub.nextBillingDate), "d 'de' MMMM", { locale: es })}</span>
                                <Badge variant="outline" className="text-[10px] h-4 px-1 border-slate-600 text-slate-400">
                                    {sub.frequency === 'monthly' ? 'Mensual' : 'Anual'}
                                </Badge>
                            </div>
                        </div>
                        <div className="font-semibold text-slate-100 tabular-nums">
                            {formatCurrency(sub.amount)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
