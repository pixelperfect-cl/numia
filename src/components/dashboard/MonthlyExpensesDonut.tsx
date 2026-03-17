import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface MonthlyExpensesDonutProps {
    data: { category: string; amount: number; color: string }[];
    total: number;
    trend?: number;
}

export function MonthlyExpensesDonut({ data, total, trend }: MonthlyExpensesDonutProps) {
    // Only take top 5 for chart + "Others"
    const chartData = useMemo(() => {
        if (data.length <= 5) return data;
        const top5 = data.slice(0, 5);
        const others = data.slice(5).reduce((acc, curr) => acc + curr.amount, 0);
        return [...top5, { category: 'Otros', amount: others, color: '#fca5a5' }];
    }, [data]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gastos por Categoría</span>
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Chart Section */}
                <div className="relative h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="amount"
                                nameKey="category"
                                stroke="none"
                                cornerRadius={4}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                                contentStyle={{
                                    backgroundColor: 'rgba(0,0,0,0.9)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    backdropFilter: 'blur(4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                                itemStyle={{ color: '#fff', fontWeight: 500 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-bold tracking-tight">{formatCurrency(total)}</span>
                        {trend !== undefined && (
                            <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1",
                                trend > 0 ? "text-rose-400 bg-rose-400/10" : "text-emerald-400 bg-emerald-400/10"
                            )}>
                                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* List Section - Scrollable but hidden scrollbar */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs group">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/30 group-hover:bg-muted/50 transition-colors">
                                    {/* Color Indicator */}
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-foreground">{item.category}</span>
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[100px] opacity-0 group-hover:opacity-100 transition-opacity">
                                        {((item.amount / total) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <span className="font-mono font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                    ))}

                    {data.length === 0 && (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic">
                            Sin gastos este mes
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
