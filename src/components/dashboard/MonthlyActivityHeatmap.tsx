import { useMemo } from 'react';
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameMonth,
    getDay,
    isToday,
    getDate
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MonthlyActivityHeatmapProps {
    data: { date: string; income: number; expense: number }[];
    currentDate?: Date;
}

export function MonthlyActivityHeatmap({ data, currentDate = new Date() }: MonthlyActivityHeatmapProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate max value for opacity scaling
    const maxDailyVolume = useMemo(() => {
        return Math.max(...data.map(d => Math.abs(d.income) + Math.abs(d.expense)), 1000);
    }, [data]);

    // Map data by date for O(1) lookup
    const dataMap = useMemo(() => {
        const map = new Map<string, { income: number; expense: number }>();
        data.forEach(d => map.set(d.date, { income: d.income, expense: d.expense }));
        return map;
    }, [data]);

    // Grid padding for starting day of week (Monday start)
    // getDay returns 0 for Sunday. We want Monday=0, Sunday=6
    const startDay = getDay(monthStart);
    const emptyDays = startDay === 0 ? 6 : startDay - 1;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Actividad Diaria</span>
                <span className="text-xs font-medium text-foreground capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                </span>
            </div>

            <div className="flex-1 grid grid-cols-7 gap-1.5 auto-rows-fr">
                {/* Weekday Headers */}
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                    <div key={i} className="text-[10px] text-muted-foreground font-medium text-center flex items-center justify-center h-4">
                        {day}
                    </div>
                ))}

                {/* Empty Cells for offset */}
                {Array.from({ length: emptyDays }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {/* Days */}
                {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayData = dataMap.get(dateStr) || { income: 0, expense: 0 };
                    const net = dayData.income - dayData.expense;
                    const totalVol = dayData.income + dayData.expense;

                    // Intensity logic (0.2 to 1.0 opacity based on volume relative to max)
                    const intensity = Math.max(0.1, Math.min((totalVol / maxDailyVolume), 1));

                    let bgClass = "bg-muted/10"; // Default empty
                    if (totalVol > 0) {
                        if (net >= 0) {
                            // Profit (Cyan/Blue)
                            bgClass = `bg-cyan-500`;
                        } else {
                            // Loss (Red)
                            bgClass = `bg-rose-500`;
                        }
                    }

                    return (
                        <TooltipProvider key={dateStr}>
                            <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "rounded-md relative group transition-all duration-300 hover:ring-2 hover:ring-ring hover:z-10 cursor-default flex items-center justify-center text-[10px]",
                                            bgClass,
                                            totalVol === 0 && "bg-muted/5 hover:bg-muted/20"
                                        )}
                                        style={{
                                            opacity: totalVol > 0 ? 0.3 + (intensity * 0.7) : 1 // Base opacity 0.3 so colors are visible
                                        }}
                                    >
                                        <span className={cn(
                                            "font-medium transition-opacity",
                                            totalVol > 0 ? "text-white opacity-80" : "text-muted-foreground opacity-30",
                                            isToday(day) && "text-primary font-bold opacity-100"
                                        )}>
                                            {getDate(day)}
                                        </span>

                                        {/* Current day indicator dot */}
                                        {isToday(day) && (
                                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary rounded-full shadow-sm ring-2 ring-background" />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs p-2 bg-card/95 backdrop-blur border-border">
                                    <div className="font-bold mb-1">{format(day, 'dd MMMM', { locale: es })}</div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <span className="text-muted-foreground">Ingresos:</span>
                                        <span className="text-emerald-400 font-mono text-right">{formatCurrency(dayData.income)}</span>

                                        <span className="text-muted-foreground">Gastos:</span>
                                        <span className="text-rose-400 font-mono text-right">{formatCurrency(dayData.expense)}</span>

                                        <div className="col-span-2 border-t border-border/50 my-1" />

                                        <span className="text-foreground font-medium">Neto:</span>
                                        <span className={cn(
                                            "font-mono font-bold text-right",
                                            net >= 0 ? "text-cyan-400" : "text-rose-400"
                                        )}>
                                            {net > 0 ? '+' : ''}{formatCurrency(net)}
                                        </span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>
        </div>
    );
}
