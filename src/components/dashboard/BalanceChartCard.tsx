import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface BalanceChartCardProps {
    label: string;
    value: string;
    data: any[];
    trend?: number; // Net change or percentage
}

export function BalanceChartCard({ label, value, data }: BalanceChartCardProps) {
    const startBalance = data[0]?.balance || 0;
    const endBalance = data[data.length - 1]?.balance || 0;
    const isPositive = endBalance >= startBalance;

    return (
        <div className={cn(
            "relative flex flex-col justify-between overflow-hidden rounded-xl border transition-all h-full",
            "bg-card/40 backdrop-blur-sm border-border/50 hover:bg-card/60"
        )}>
            <div className="p-4 pb-0 z-10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</span>
                <div className="text-2xl font-light tracking-tight text-foreground">{value}</div>
            </div>

            <div className="h-[60px] w-full mt-auto absolute bottom-0 left-0 right-0 opacity-50 hover:opacity-80 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke={isPositive ? "#10b981" : "#ef4444"}
                            fillOpacity={1}
                            fill="url(#colorBalance)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
