
import { useMemo } from 'react';
import { format, eachMonthOfInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Subscription } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle } from 'lucide-react';

interface AnnualServiceGridProps {
    subscriptions: Subscription[];
    year?: number;
}

export function AnnualServiceGrid({ subscriptions, year = new Date().getFullYear() }: AnnualServiceGridProps) {
    const monthsData = useMemo(() => {
        const months = eachMonthOfInterval({
            start: startOfYear(new Date(year, 0, 1)),
            end: endOfYear(new Date(year, 0, 1))
        });

        return months.map(month => {
            const start = startOfMonth(month);
            const end = endOfMonth(month);

            // Active subs in this month
            const activeSubs = subscriptions.filter(sub => {
                if (sub.status !== 'active') return false;
                const subStart = parseISO(sub.startDate);
                // Simple active check: Start date <= Month End
                return subStart <= end;
            });

            // Totals
            const totalCLP = activeSubs.filter(s => s.currency === 'CLP' || !s.currency).reduce((sum, s) => sum + s.amount, 0);
            const totalUF = activeSubs.filter(s => s.currency === 'UF').reduce((sum, s) => sum + s.amount, 0);

            return {
                date: month,
                label: format(month, 'MMMM', { locale: es }),
                subs: activeSubs,
                totalCLP,
                totalUF
            };
        });
    }, [subscriptions, year]);

    return (
        <div className="w-full h-full flex flex-col pt-2">
            <div className="flex justify-between items-center px-4 mb-2">
                <h3 className="text-sm font-semibold tracking-wide text-foreground">Planificación Anual de Servicios</h3>
                <Badge variant="outline" className="text-xs border-cyan-500/20 text-cyan-500 bg-cyan-500/10">
                    {year}
                </Badge>
            </div>

            <ScrollArea className="w-full flex-1 border-t border-white/5 bg-black/20">
                <div className="flex gap-4 p-4 min-w-max">
                    {monthsData.map((month, idx) => (
                        <div key={idx} className="w-[280px] flex-shrink-0 flex flex-col gap-3">
                            {/* Column Header */}
                            <div className="bg-card/40 border border-white/5 rounded-xl p-3 backdrop-blur-sm">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="capitalize font-bold text-foreground text-sm">{month.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{month.subs.length} activos</span>
                                </div>
                                <div className="space-y-1">
                                    {month.totalCLP > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Total CLP:</span>
                                            <span className="font-mono text-emerald-400">{formatCurrency(month.totalCLP)}</span>
                                        </div>
                                    )}
                                    {month.totalUF > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Total UF:</span>
                                            <span className="font-mono text-cyan-400">UF {month.totalUF.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {month.totalCLP === 0 && month.totalUF === 0 && (
                                        <div className="text-[10px] text-muted-foreground italic text-center py-1">Sin ingresos proyectados</div>
                                    )}
                                </div>
                            </div>

                            {/* Services List */}
                            <div className="flex flex-col gap-2">
                                {month.subs.map(sub => (
                                    <div key={sub.id} className="group relative bg-zinc-900/40 border border-white/5 hover:border-cyan-500/30 rounded-lg p-3 transition-all hover:bg-zinc-900/60">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-xs text-zinc-200 truncate pr-2">{sub.name}</span>
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500 opacity-50 group-hover:opacity-100" />
                                        </div>
                                        <div className="text-[10px] text-zinc-500 mb-2 truncate">
                                            {sub.notes || "Servicio recurrente"}
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>Activo</span>
                                            </div>
                                            <span className={sub.currency === 'UF' ? "text-cyan-400 text-xs font-mono" : "text-emerald-400 text-xs font-mono"}>
                                                {sub.currency === 'UF' ? `UF ${sub.amount}` : formatCurrency(sub.amount)}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {month.subs.length === 0 && (
                                    <div className="h-24 border border-dashed border-white/5 rounded-lg flex items-center justify-center">
                                        <span className="text-[10px] text-zinc-700">Vacío</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="bg-white/5 h-2" />
            </ScrollArea>
        </div>
    );
}
