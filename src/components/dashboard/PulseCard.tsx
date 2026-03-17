
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PulseCardProps {
    label: string;
    value: string;
    subtext: string;
    type?: 'standard' | 'progress' | 'battery' | 'alert' | 'success' | 'danger';
    progress?: number; // 0-100
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
}

export function PulseCard({ label, value, subtext, type = 'standard', progress = 0, trend, trendValue }: PulseCardProps) {
    return (
        <div className={cn(
            "relative flex flex-col justify-between overflow-hidden rounded-xl border transition-all h-full p-4",
            "bg-card/40 backdrop-blur-sm border-border/50 hover:bg-card/60",
            type === 'alert' && "border-destructive/50 bg-destructive/10",
            type === 'success' && "border-emerald-500/20 bg-emerald-500/5",
            type === 'danger' && "border-red-500/20 bg-red-500/5"
        )}>
            <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        trend === 'up' && "text-emerald-400 bg-emerald-400/10",
                        trend === 'down' && "text-red-400 bg-red-400/10",
                        trend === 'neutral' && "text-muted-foreground bg-muted/20"
                    )}>
                        {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                        {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                        {trend === 'neutral' && <Minus className="w-3 h-3" />}
                        {trendValue}
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between gap-2">
                <div>
                    <div className={cn(
                        "text-2xl font-light tracking-tight text-foreground",
                        type === 'alert' && "text-destructive drop-shadow-sm font-normal",
                        type === 'success' && "text-emerald-400",
                        type === 'danger' && "text-red-400"
                    )}>
                        {value}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                        {type === 'alert' && <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />}
                        {subtext}
                    </div>
                </div>

                {/* Visual Indicator based on Type */}
                {type === 'progress' && (
                    <div className="relative h-10 w-10 flex items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" className="text-primary" stroke="currentColor" strokeWidth="3" strokeDasharray={`${progress}, 100`} />
                        </svg>
                    </div>
                )}

                {type === 'battery' && (
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={cn("h-6 w-1.5 rounded-full", i <= (progress / 20) ? "bg-primary" : "bg-muted")} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
