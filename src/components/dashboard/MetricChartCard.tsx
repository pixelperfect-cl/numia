import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricChartCardProps {
    label: string;
    value: string;
    subtext?: string;
    data: any[]; // Expects { value: number } or { balance: number }
    dataKey?: string;
    trend?: number; // Percentage
    trendDirection?: 'up' | 'down' | 'neutral';
    color?: 'emerald' | 'rose' | 'cyan' | 'blue'; // Semantic colors
}

export function MetricChartCard({
    label,
    value,
    subtext,
    data,
    dataKey = "value",
    trend,
    trendDirection,
    color = 'cyan'
}: MetricChartCardProps) {

    // Color configurations
    const colors = {
        emerald: { stroke: "#10b981", fill: "#10b981", bg: "bg-emerald-500/5", border: "border-emerald-500/10", trend: "text-emerald-400 bg-emerald-400/10" },
        rose: { stroke: "#f43f5e", fill: "#f43f5e", bg: "bg-rose-500/5", border: "border-rose-500/10", trend: "text-rose-400 bg-rose-400/10" },
        cyan: { stroke: "#06b6d4", fill: "#06b6d4", bg: "bg-cyan-500/5", border: "border-cyan-500/10", trend: "text-cyan-400 bg-cyan-400/10" },
        blue: { stroke: "#3b82f6", fill: "#3b82f6", bg: "bg-blue-500/5", border: "border-blue-500/10", trend: "text-blue-400 bg-blue-400/10" },
    };

    const activeColor = colors[color];

    return (
        <div className={cn(
            "relative flex flex-col justify-between overflow-hidden rounded-xl border transition-all h-full",
            "bg-card/40 backdrop-blur-sm hover:bg-card/60",
            activeColor.bg,
            activeColor.border
        )}>
            <div className="p-4 pb-0 z-10">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>

                    {/* Trend Badge */}
                    {trend !== undefined && (
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            trendDirection === 'up' && "text-emerald-400 bg-emerald-400/10",
                            trendDirection === 'down' && "text-rose-400 bg-rose-400/10",
                            trendDirection === 'neutral' && "text-muted-foreground bg-muted/20"
                        )}>
                            {trendDirection === 'up' && <TrendingUp className="w-3 h-3" />}
                            {trendDirection === 'down' && <TrendingDown className="w-3 h-3" />}
                            {trendDirection === 'neutral' && <Minus className="w-3 h-3" />}
                            {Math.abs(trend).toFixed(1)}%
                        </div>
                    )}
                </div>

                <div className="text-2xl font-light tracking-tight text-foreground">{value}</div>
                {subtext && <div className="text-[10px] text-muted-foreground mt-1">{subtext}</div>}
            </div>

            <div className="h-[60px] w-full mt-auto absolute bottom-0 left-0 right-0 opacity-40 hover:opacity-60 transition-opacity mask-linear-fade">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`colorGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeColor.fill} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={activeColor.fill} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={activeColor.stroke}
                            fillOpacity={1}
                            fill={`url(#colorGradient-${color})`}
                            strokeWidth={2}
                            isAnimationActive={true}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
