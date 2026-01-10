/**
 * Numia v1.0 - Report Card Component
 * Reusable metric card for reports
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        label: string;
    };
    loading?: boolean;
    className?: string;
    valueClassName?: string;
}

export function ReportCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    loading,
    className,
    valueClassName
}: ReportCardProps) {
    if (loading) {
        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-5 rounded" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-3 w-40" />
                </CardContent>
            </Card>
        );
    }

    const trendPositive = trend && trend.value >= 0;

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
                <div className={cn('text-2xl font-bold break-words', valueClassName)}>
                    {value}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
                {trend && (
                    <div className={cn(
                        'flex items-center gap-1 mt-2 text-xs font-medium',
                        trendPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                    )}>
                        {trendPositive ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(trend.value)}%</span>
                        <span className="text-muted-foreground">{trend.label}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
