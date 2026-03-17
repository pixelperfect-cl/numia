
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { formatCurrency, parseLocalDateString } from '@/lib/utils';
import { format, eachMonthOfInterval, startOfYear, endOfYear, startOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Subscription } from '@/types';
import { useMemo } from 'react';

import { useIndicators } from '@/hooks/useIndicators';

interface MonthlyRevenueChartProps {
    subscriptions: Subscription[];
    year?: number;
}

const DEFAULT_UF_VALUE = 39730; // Fallback

export function MonthlyRevenueChart({ subscriptions, year = new Date().getFullYear() }: MonthlyRevenueChartProps) {
    const { indicators } = useIndicators();
    const ufValue = indicators.find(i => i.codigo === 'uf')?.valor || DEFAULT_UF_VALUE;

    const data = useMemo(() => {
        const months = eachMonthOfInterval({
            start: startOfYear(new Date(year, 0, 1)),
            end: endOfYear(new Date(year, 0, 1))
        });

        return months.map(month => {
            const monthIdx = month.getMonth();

            // 1. Monthly Base
            const monthlyServices = subscriptions.filter(sub =>
                sub.status === 'active' && sub.frequency === 'monthly'
            );

            let monthlyBaseCLP = 0;
            let monthlyBaseUF = 0;
            let count = monthlyServices.length;

            monthlyServices.forEach(sub => {
                if (sub.currency === 'UF') {
                    monthlyBaseUF += sub.amount;
                } else {
                    monthlyBaseCLP += sub.amount;
                }
            });

            // 2. Annual Extras
            const yearlyServices = subscriptions.filter(sub =>
                sub.status === 'active' && sub.frequency !== 'monthly'
            );

            let yearlyExtraCLP = 0;
            let yearlyExtraUF = 0;

            yearlyServices.forEach(sub => {
                if (!sub.nextBillingDate) return;
                const date = parseLocalDateString(sub.nextBillingDate);
                if (isNaN(date.getTime())) return;

                const billingMonthIdx = date.getMonth();

                if (billingMonthIdx === monthIdx) {
                    if (sub.currency === 'UF') {
                        yearlyExtraUF += sub.amount;
                    } else {
                        yearlyExtraCLP += sub.amount;
                    }
                    count++;
                }
            });

            // 3. Totals
            const totalCLP = monthlyBaseCLP + yearlyExtraCLP;
            const totalUF = monthlyBaseUF + yearlyExtraUF;
            const totalValue = totalCLP + (totalUF * ufValue);
            const baseValue = monthlyBaseCLP + (monthlyBaseUF * ufValue);

            return {
                name: format(month, 'MMM', { locale: es }),
                fullDate: format(month, 'MMMM yyyy', { locale: es }),
                value: totalValue,
                clp: totalCLP,
                uf: totalUF,
                count,
                baseValue, // Useful if we want a stacked bar later
                monthlyBaseCLP,
                monthlyBaseUF,
                yearlyExtraCLP,
                yearlyExtraUF
            };
        });
    }, [subscriptions, year, ufValue]);

    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="w-full h-full flex flex-col pt-4 pb-2 px-2 select-none">
            <div className="flex justify-between items-center px-4 mb-4">
                <div>
                    <h3 className="text-sm font-semibold tracking-wide text-foreground">Facturación Combinada (Mensual + Anual)</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Distribución por Mes {year}</p>
                </div>
            </div>

            <div className="flex-1 min-h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={28} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="barGradientHigh" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            dy={10}
                        />
                        <YAxis
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 6 }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    const hasExtras = item.yearlyExtraCLP > 0 || item.yearlyExtraUF > 0;

                                    return (
                                        <div className="bg-popover/90 backdrop-blur border border-border text-popover-foreground rounded-xl shadow-xl p-3 text-xs min-w-[180px]">
                                            <p className="font-bold mb-2 capitalize text-muted-foreground">{item.fullDate}</p>
                                            <p className="text-xl font-bold text-cyan-400 mb-2">{formatCurrency(item.value)}</p>

                                            <div className="space-y-2 pt-2 border-t border-border/50">
                                                {/* Mini Breakdown */}
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="text-blue-400">Base Mensual:</span>
                                                    <div className="text-right">
                                                        <div className="flex gap-2">
                                                            <span className="block text-muted-foreground">CLP:</span>
                                                            <span className="block font-mono">{formatCurrency(item.monthlyBaseCLP + (item.monthlyBaseUF * ufValue))}</span>
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <span className="block text-muted-foreground">UF:</span>
                                                            <span className="block font-mono">UF {(item.monthlyBaseUF + (item.monthlyBaseCLP / ufValue)).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {hasExtras && (
                                                    <div className="flex justify-between items-center text-[10px] border-t border-border/30 pt-1 mt-1">
                                                        <span className="text-emerald-400">Cobros Anuales:</span>
                                                        <div className="text-right">
                                                            <div className="flex gap-2">
                                                                <span className="block text-muted-foreground">Or:</span>
                                                                <span className="block font-mono">{formatCurrency(item.yearlyExtraCLP + (item.yearlyExtraUF * ufValue))}</span>
                                                            </div>
                                                            <div className="flex gap-2 justify-end">
                                                                <span className="block text-muted-foreground">Eq:</span>
                                                                <span className="block font-mono">UF {(item.yearlyExtraUF + (item.yearlyExtraCLP / ufValue)).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center pt-2 border-t border-border/30">
                                                    <span className="text-[10px] text-muted-foreground">Servicios Activos:</span>
                                                    <span className="text-[10px] font-medium">{item.count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="value"
                            radius={[6, 6, 6, 6]}
                            // If bar has extra yearly income, make it greener/brighter to highlight
                            fill="url(#barGradient)"
                            animationDuration={1000}
                            animationBegin={0}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={(entry.yearlyExtraCLP > 0 || entry.yearlyExtraUF > 0) ? "url(#barGradientHigh)" : "url(#barGradient)"}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
