
import { useMemo } from 'react';
import { format, eachMonthOfInterval, startOfYear, endOfYear, isWithinInterval, addMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, parseLocalDateString } from '@/lib/utils';
import type { Subscription } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface YearlyServiceHeatmapProps {
    subscriptions: Subscription[];
    year?: number;
}

export function YearlyServiceHeatmap({ subscriptions, year = new Date().getFullYear() }: YearlyServiceHeatmapProps) {
    const months = useMemo(() => {
        return eachMonthOfInterval({
            start: startOfYear(new Date(year, 0, 1)),
            end: endOfYear(new Date(year, 0, 1))
        });
    }, [year]);

    // Calculate intensity per month (Active YEARLY subscriptions that month)
    const heatmapData = useMemo(() => {
        return months.map(month => {
            const monthIdx = month.getMonth();

            // Filter only yearly services (Consistent with other charts)
            const yearlyServices = subscriptions.filter(sub =>
                sub.status === 'active' && sub.frequency !== 'monthly'
            );

            // Count how many yearly services bill in this month
            const activeCount = yearlyServices.filter(sub => {
                if (!sub.nextBillingDate) return false;
                const date = parseLocalDateString(sub.nextBillingDate);
                if (isNaN(date.getTime())) return false;
                return date.getMonth() === monthIdx;
            }).length;

            return {
                date: month,
                count: activeCount,
                label: format(month, 'MMM', { locale: es })
            };
        });
    }, [months, subscriptions]);

    const maxDensity = Math.max(...heatmapData.map(d => d.count), 1); // Avoid 0 div

    const getColor = (count: number) => {
        if (count === 0) return 'bg-muted/40';
        const intensity = count / maxDensity;
        if (intensity < 0.25) return 'bg-cyan-500/20 text-cyan-500'; // Low
        if (intensity < 0.5) return 'bg-cyan-500/40 text-cyan-400'; // Med-Low
        if (intensity < 0.75) return 'bg-cyan-500/60 text-cyan-300'; // Med-High
        return 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20'; // High
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Distribución de Servicios Anuales</h3>
                <span className="text-xs text-muted-foreground">Cobros por Mes - {year}</span>
            </div>

            <div className="grid grid-cols-12 gap-2">
                {heatmapData.map((data, idx) => (
                    <div key={idx} className="flex flex-col gap-1 items-center group">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(
                                        "w-full aspect-[3/5] rounded-md transition-all flex items-end justify-center pb-2 cursor-default relative overflow-hidden",
                                        "hover:ring-1 hover:ring-cyan-500/50",
                                        getColor(data.count)
                                    )}>
                                        <span className="text-[10px] font-medium z-10 relative">{data.count > 0 ? data.count : '-'}</span>

                                        {/* Bar cosmetic (height relative to max) */}
                                        {data.count > 0 && (
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-current opacity-20"
                                                style={{ height: `${(data.count / maxDensity) * 100}%` }}
                                            />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-bold capitalize">{format(data.date, 'MMMM yyyy', { locale: es })}</p>
                                    <p>{data.count} Servicios Anuales Facturan</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <span className="text-[10px] text-muted-foreground uppercase">{data.label.charAt(0)}</span>
                    </div>
                ))}
            </div>

            <div className="flex justify-between mt-3 px-1">
                <div className="flex gap-2 items-center text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded bg-muted/40" /> <span>Sin actividad</span>
                </div>
                <div className="flex gap-2 items-center text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded bg-cyan-500" /> <span>Alta densidad</span>
                </div>
            </div>
        </div>
    );
}
