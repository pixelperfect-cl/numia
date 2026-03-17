
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency, parseLocalDateString } from '@/lib/utils';
import { format, eachMonthOfInterval, startOfYear, endOfYear, startOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Subscription } from '@/types';
import { useMemo } from 'react';

import { useIndicators } from '@/hooks/useIndicators';

interface AnnualRevenueWaveChartProps {
    subscriptions: Subscription[];
    year?: number;
}

const DEFAULT_UF_VALUE = 39730; // Fallback

export function AnnualRevenueWaveChart({ subscriptions, year = new Date().getFullYear() }: AnnualRevenueWaveChartProps) {
    const { indicators } = useIndicators();
    const ufValue = indicators.find(i => i.codigo === 'uf')?.valor || DEFAULT_UF_VALUE;

    const data = useMemo(() => {
        const months = eachMonthOfInterval({
            start: startOfYear(new Date(year, 0, 1)),
            end: endOfYear(new Date(year, 0, 1))
        });

        return months.map(month => {
            const monthIdx = month.getMonth(); // 0-11

            // 1. Calculate Monthly Recurring Revenue (Base for every month)
            const monthlyServices = subscriptions.filter(sub =>
                sub.status === 'active' && sub.frequency === 'monthly'
            );

            let monthlyBaseCLP = 0;
            let monthlyBaseUF = 0;

            monthlyServices.forEach(sub => {
                if (sub.currency === 'UF') {
                    monthlyBaseUF += sub.amount;
                } else {
                    monthlyBaseCLP += sub.amount;
                }
            });

            // 2. Calculate Annual/Periodic Revenue (Specific for this month)
            const yearlyServices = subscriptions.filter(sub =>
                sub.status === 'active' && sub.frequency !== 'monthly'
            );

            let yearlyExtraCLP = 0;
            let yearlyExtraUF = 0;

            yearlyServices.forEach(sub => {
                // Use nextBillingDate for projection, identical logic to Services/Kanban view
                if (!sub.nextBillingDate) return;

                // Use parseLocalDateString to avoid timezone issues
                const date = parseLocalDateString(sub.nextBillingDate);

                // Safe check for invalid dates
                if (isNaN(date.getTime())) return;

                const billingMonthIdx = date.getMonth(); // 0-11

                // Yearly services only count in their billing month
                if (billingMonthIdx === monthIdx) {
                    if (sub.currency === 'UF') {
                        yearlyExtraUF += sub.amount;
                    } else {
                        yearlyExtraCLP += sub.amount;
                    }
                }
            });

            // 3. Totals
            const totalCLP = monthlyBaseCLP + yearlyExtraCLP;
            const totalUF = monthlyBaseUF + yearlyExtraUF;
            const totalValue = totalCLP + (totalUF * ufValue);

            // Base value (MRR) for visualization
            const baseValue = (monthlyBaseCLP + (monthlyBaseUF * ufValue));

            return {
                name: format(month, 'MMM', { locale: es }),
                fullDate: format(month, 'MMMM yyyy', { locale: es }),
                value: totalValue,
                baseValue: baseValue,
                extraValue: totalValue - baseValue,
                clp: totalCLP,
                uf: totalUF,
                monthlyBaseCLP,
                monthlyBaseUF,
                yearlyExtraCLP,
                yearlyExtraUF,
                ufValueUsed: ufValue
            };
        });
    }, [subscriptions, year, ufValue]);

    const totalAnnual = data.reduce((acc, curr) => acc + curr.value, 0);
    const totalAnnualUF = totalAnnual / ufValue;

    return (
        <div className="w-full h-full flex flex-col pt-4 pb-2 px-2 select-none">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 px-4">
                <div className="flex-1">
                    <h3 className="text-sm font-semibold tracking-wide text-foreground">Proyección de Ingresos Totales</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Base Mensual + Cobros Anuales {year}</p>
                </div>

                <div className="flex items-center h-full">
                    <div className="px-6 border-l border-white/10 text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Total Anual (CLP)</p>
                        <p className="text-2xl font-bold text-[#8ec5ff] tabular-nums">
                            {formatCurrency(totalAnnual)}
                        </p>
                    </div>
                    <div className="px-6 border-l border-white/10 text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Total Anual (UF)</p>
                        <p className="text-2xl font-bold text-foreground tabular-nums">
                            {totalAnnualUF.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[250px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }} barGap={4}>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#cbd5e1', fontSize: 10 }}
                            interval={0}
                            dy={10}
                        />
                        <YAxis
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#cbd5e1', fontSize: 10 }}
                            tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                        <div className="bg-popover/90 backdrop-blur border border-border text-popover-foreground rounded-xl shadow-xl p-3 text-xs min-w-[200px]">
                                            <p className="font-bold mb-1 capitalize text-muted-foreground">{item.fullDate}</p>
                                            <p className="text-lg font-bold text-[#8ec5ff] mb-2">{formatCurrency(item.value)}</p>

                                            <div className="space-y-2">
                                                <div className="pt-2 border-t border-border/50">
                                                    <p className="text-[10px] uppercase font-semibold text-[#2b7fff] mb-1">Base Mensual (Recurrente)</p>
                                                    <div className="flex justify-between items-center text-[10px] pl-2">
                                                        <span className="text-muted-foreground">CLP:</span>
                                                        <span className="font-mono">{formatCurrency(item.monthlyBaseCLP + (item.monthlyBaseUF * ufValue))}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] pl-2">
                                                        <span className="text-muted-foreground">UF:</span>
                                                        <span className="font-mono">UF {(item.monthlyBaseUF + (item.monthlyBaseCLP / ufValue)).toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                {item.extraValue > 0 && (
                                                    <div className="pt-2 border-t border-border/50">
                                                        <p className="text-[10px] uppercase font-semibold text-[#155dfc] mb-1">Extras Anuales este mes</p>
                                                        <div className="flex justify-between items-center text-[10px] pl-2">
                                                            <span className="text-muted-foreground">CLP:</span>
                                                            <span className="font-mono">{formatCurrency(item.yearlyExtraCLP + (item.yearlyExtraUF * ufValue))}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] pl-2">
                                                            <span className="text-muted-foreground">UF:</span>
                                                            <span className="font-mono">UF {(item.yearlyExtraUF + (item.yearlyExtraCLP / ufValue)).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-2 border-t border-border/50">
                                                    <p className="text-[10px] uppercase font-semibold text-[#8ec5ff] mb-1">Total del Mes</p>
                                                    <div className="flex justify-between items-center text-[10px] pl-2">
                                                        <span className="text-muted-foreground">Total CLP:</span>
                                                        <span className="font-mono font-medium text-[#8ec5ff]">
                                                            {formatCurrency((item.monthlyBaseCLP + item.yearlyExtraCLP) + ((item.monthlyBaseUF + item.yearlyExtraUF) * ufValue))}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] pl-2">
                                                        <span className="text-muted-foreground">Total UF:</span>
                                                        <span className="font-mono font-medium text-emerald-400">
                                                            UF {((item.monthlyBaseUF + item.yearlyExtraUF) + ((item.monthlyBaseCLP + item.yearlyExtraCLP) / ufValue)).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {/* Bar 1: Extras Anuales (Dark Blue) */}
                        <Bar
                            dataKey="extraValue"
                            name="Anual"
                            fill="#155dfc"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={20}
                        />
                        {/* Bar 2: Base Mensual (Medium Blue) */}
                        <Bar
                            dataKey="baseValue"
                            name="Mensual"
                            fill="#2b7fff"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={20}
                        />
                        {/* Bar 3: Total (Light Blue) */}
                        <Bar
                            dataKey="value"
                            name="Total"
                            fill="#8ec5ff"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
