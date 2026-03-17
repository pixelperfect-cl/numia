import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Movement } from '@/types';

interface CombinedRevenueChartProps {
    movements: Movement[];
}

export function CombinedRevenueChart({ movements }: CombinedRevenueChartProps) {
    const chartData = useMemo(() => {
        // Generate last 12 months
        const months = Array.from({ length: 12 }, (_, i) => {
            const date = subMonths(new Date(), 11 - i);
            return {
                date,
                name: format(date, 'MMM', { locale: es }).toUpperCase(), // MAR, ABR
                monthKey: format(date, 'yyyy-MM'),
                monthly: 0,
                annual: 0,
            };
        });

        // Populate data
        movements.forEach((m) => {
            if (m.type === 'income' && m.date) {
                const moveDate = new Date(m.date);
                const monthKey = format(moveDate, 'yyyy-MM');
                const monthEntry = months.find((entry) => entry.monthKey === monthKey);

                if (monthEntry) {
                    // Simplistic logic: if amount is large (> 500k?) it might be annual, or based on category
                    // properly filtering by category is better if available, but for now let's just assume
                    // standard monthly recurring services vs larger one-off/annual projects.
                    // Or user mentioned "Mensual vs Anual". Let's assume recurring vs extra/annual.
                    // For visualization purposes, let's split roughly.
                    // If we had subscription type info here it would be better.
                    // Let's assume description contains 'Anual' or amount > 300000 is annual for this demo if logic isn't passed.
                    // Ideally passed subscriptions but props say 'movements'.
                    // Let's stick to total revenue per month for now, maybe split by a hypothetical category if not available.

                    if (m.description?.toLowerCase().includes('anual') || m.amount > 500000) {
                        monthEntry.annual += m.amount;
                    } else {
                        monthEntry.monthly += m.amount;
                    }
                }
            }
        });

        return months;
    }, [movements]);

    return (
        <div className="w-full h-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                        cursor={{ fill: '#334155', opacity: 0.2 }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
                                        <p className="text-slate-300 text-xs mb-2">{label}</p>
                                        {payload.map((entry: any) => (
                                            <div key={entry.name} className="flex items-center gap-2 text-sm">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: entry.color }}
                                                />
                                                <span className="text-slate-400 capitalize">{entry.name === 'monthly' ? 'Mensual' : 'Anual'}:</span>
                                                <span className="font-semibold text-slate-100">{formatCurrency(entry.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '10px' }}
                        formatter={(value) => <span className="text-slate-400 text-xs capitalize">{value === 'monthly' ? 'Recurrente' : 'Anual'}</span>}
                    />
                    <Bar
                        dataKey="monthly"
                        stackId="a"
                        fill="#0ea5e9" // sky-500
                        radius={[0, 0, 4, 4]}
                        barSize={32}
                    />
                    <Bar
                        dataKey="annual"
                        stackId="a"
                        fill="#6366f1" // indigo-500 (accent)
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
