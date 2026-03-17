import { useMemo } from 'react';
import { Movement } from '@/types';
import { formatCurrency, parseLocalDate } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RecentMovementsWidgetProps {
    movements: Movement[];
    limit?: number;
}

export function RecentMovementsWidget({ movements, limit = 10 }: RecentMovementsWidgetProps) {
    const recentMovements = useMemo(() => {
        return [...movements]
            .sort((a, b) => {
                const dateA = parseLocalDate(a.date);
                const dateB = parseLocalDate(b.date);
                return dateB.getTime() - dateA.getTime();
            })
            .slice(0, limit);
    }, [movements, limit]);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold tracking-wide text-foreground">Movimientos Recientes</h3>
                </div>
                <span className="text-xs text-muted-foreground">Últimos {limit}</span>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                    {recentMovements.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                            No hay movimientos registrados
                        </div>
                    ) : (
                        recentMovements.map((movement) => {
                            const date = parseLocalDate(movement.date);
                            const isIncome = movement.type === 'income';

                            return (
                                <div
                                    key={movement.id}
                                    className="group relative bg-card/40 border border-white/5 hover:border-cyan-500/30 rounded-lg p-3 transition-all hover:bg-card/60"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={cn(
                                                    "p-1 rounded",
                                                    isIncome ? "bg-emerald-500/10" : "bg-red-500/10"
                                                )}>
                                                    {isIncome ? (
                                                        <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                                                    ) : (
                                                        <ArrowDownRight className="h-3 w-3 text-red-400" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-foreground truncate">
                                                    {movement.description || 'Sin descripción'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground capitalize">
                                                {format(date, "dd MMM yyyy", { locale: es })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "text-sm font-bold tabular-nums",
                                                isIncome ? "text-emerald-400" : "text-red-400"
                                            )}>
                                                {isIncome ? '+' : '-'}{formatCurrency(Math.abs(movement.amount))}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
