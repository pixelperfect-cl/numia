
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export type StatusType = 'healthy' | 'warning' | 'critical' | 'unknown';

interface StatusIndicatorProps {
    title: string;
    metric: string | number;
    description?: string;
    status: StatusType;
    className?: string;
    icon?: any;
}

export function StatusIndicator({ title, metric, description, status, className, icon: IconProp }: StatusIndicatorProps) {

    const getStatusColor = (s: StatusType) => {
        switch (s) {
            case 'healthy': return 'bg-emerald-500 text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-400';
            case 'warning': return 'bg-amber-500 text-amber-50 shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-400';
            case 'critical': return 'bg-red-500 text-red-50 shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-400';
            default: return 'bg-slate-500 text-slate-50 border-slate-400';
        }
    };

    const getStatusIcon = (s: StatusType) => {
        if (IconProp) return IconProp;
        switch (s) {
            case 'healthy': return CheckCircle2;
            case 'warning': return AlertTriangle;
            case 'critical': return XCircle;
            default: return HelpCircle;
        }
    };

    const Icon = getStatusIcon(status);

    return (
        <Card className={cn("relative overflow-hidden transition-all duration-300 hover:scale-[1.02]", className)}>
            {/* Glow Effect / Status Bar */}
            <div className={cn("absolute top-0 left-0 w-1.5 h-full", getStatusColor(status).split(' ')[0])} />

            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {title}
                </CardTitle>
                <div className={cn("p-1.5 rounded-full", getStatusColor(status).replace('border-', ''))}>
                    <Icon className="w-4 h-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold tracking-tight mb-1">{metric}</div>
                {description && (
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
