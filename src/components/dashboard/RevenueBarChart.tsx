
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { format, eachMonthOfInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Subscription } from '@/types';
import { useMemo } from 'react';

interface RevenueBarChartProps {
    subscriptions: Subscription[];
    year?: number;
}

export function RevenueBarChart({ subscriptions, year = new Date().getFullYear() }: RevenueBarChartProps) {
    const data = useMemo(() => {
        const months = eachMonthOfInterval({
            start: startOfYear(new Date(year, 0, 1)),
            end: endOfYear(new Date(year, 0, 1))
        });

        return months.map(month => {
            const start = startOfMonth(month);
            const end = endOfMonth(month);

            // Calculate Total Annual Value of active subscriptions in this month
            const arr = subscriptions.reduce((sum, sub) => {
                if (sub.status !== 'active') return sum;

                const subStart = parseISO(sub.startDate);

                // Check if subscription was active during this month
                // (Simple logic: Start date is on or before end of month)
                if (subStart <= end) {
                    // Calculate Annual Value
                    const annualValue = sub.frequency === 'monthly' ? sub.amount * 12 : sub.amount;
                    return sum + annualValue;
                }
                return sum;
            }, 0);

            return {
                name: format(month, 'MMM', { locale: es }),
                fullDate: format(month, 'MMMM yyyy', { locale: es }),
                value: arr,
            };
        });
    }, [subscriptions, year]);

    return (
        <div className="w-full h-full flex flex-col pt-4 pb-2 px-2 select-none">
            {/* Legend / Context if needed, or kept clean */}
            <div className="flex-1 min-h-[200px] w-full relative">
                {/* Background Tracks (Simulated with absolute div bars or Recharts tick logic? 
               Recharts doesn't handle z-index of tracks well in the same chart without custom shapes.
               Using a CSS grid overlay for tracks might be cleaner or just simple Recharts bars.
               Let's stick to standard bars but with high contrast Cyan.
           */}
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={32}>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            dy={10}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 6 }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                        <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg shadow-2xl p-3 text-xs min-w-[140px]">
                                            <p className="font-semibold mb-1 capitalize text-zinc-400">{item.fullDate}</p>
                                            <p className="text-xl font-bold text-white tracking-tight">{formatCurrency(item.value)}</p>
                                            <p className="text-[10px] text-cyan-400 font-medium mt-1">Valor Anualizado (ARR)</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        {/* Background 'Track' Bar - We can render two bars: one max value gray, one real value cyan. 
                       But simpler is just the value bar. The reference had grey tracks. 
                       Let's Add a 'max' bar for the track effect.
                   */}
                        <Bar
                            dataKey="value" // Actual Value
                            radius={[6, 6, 6, 6]}
                            fill="#06b6d4" // Cyan-500
                        // animationDuration={1000}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.value > 0 ? "#22d3ee" : "hsl(var(--muted)/0.3)"} // Cyan-400
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
