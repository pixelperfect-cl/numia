
import { useMemo } from 'react';
import { eachDayOfInterval, format, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Subscription } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ServiceHeatmapProps {
    subscriptions: Subscription[];
    monthsToShow?: number;
}

export function ServiceHeatmap({ subscriptions, monthsToShow = 3 }: ServiceHeatmapProps) {
    // Always show "Last N Months" including current
    const today = new Date();

    // Calculate date range: Start from Monday of the first month
    const startDate = startOfWeek(startOfMonth(subMonths(today, monthsToShow - 1)), { weekStartsOn: 1 });
    const endDate = endOfWeek(endOfMonth(today), { weekStartsOn: 1 });

    const calendarDays = useMemo(() => {
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [startDate, endDate]);

    // Calculate density
    const getDensity = (date: Date) => {
        return subscriptions.filter(s => {
            if (!s.nextBillingDate) return false;
            return isSameDay(new Date(s.nextBillingDate), date);
        }).length;
    };

    const getColor = (count: number) => {
        if (count === 0) return 'bg-muted/30';
        if (count <= 1) return 'bg-emerald-500/40 hover:bg-emerald-500/60';
        if (count <= 3) return 'bg-emerald-500/70 hover:bg-emerald-500/80';
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    };

    return (
        <div className="h-full w-full flex flex-col p-4">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                    <Activity className="h-4 w-4" />
                </div>
                <div>
                    <p className="font-semibold text-sm">Consistencia</p>
                    <p className="text-[10px] text-muted-foreground">Últimos {monthsToShow} meses</p>
                </div>
            </div>

            <div className="flex-1 w-full overflow-hidden flex items-center justify-center">
                <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
                    {calendarDays.map((day, idx) => {
                        const density = getDensity(day);
                        return (
                            <TooltipProvider key={idx}>
                                <Tooltip delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "w-2.5 h-2.5 rounded-[2px] transition-all",
                                                getColor(density)
                                            )}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p className="font-bold text-xs">{format(day, 'd MMM', { locale: es })}</p>
                                        <p className="text-[10px]">{density} eventos</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
