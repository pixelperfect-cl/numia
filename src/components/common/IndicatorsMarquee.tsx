import { useIndicators } from '@/hooks/useIndicators';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function IndicatorsMarquee() {
    const { indicators, loading, error } = useIndicators();

    if (loading || error || indicators.length === 0) {
        return null;
    }

    // Format currency
    const formatValue = (code: string, value: number) => {
        if (code === 'dolar' || code === 'euro' || code === 'uf' || code === 'utm') {
            return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
        }
        if (code === 'bitcoin') {
            return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD' }).format(value);
        }
        return value;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex h-8 bg-header-background border-t items-center overflow-hidden whitespace-nowrap w-full md:relative md:top-0 md:border-t-0 md:border-b md:z-auto">
            <div className="animate-marquee flex items-center gap-8 w-max pl-4 hover:[animation-play-state:paused]">
                {/* Render multiple times for seamless loop on wide screens */}
                {[...indicators, ...indicators, ...indicators, ...indicators].map((indicator, index) => (
                    <div key={`${indicator.codigo}-${index}`} className="flex items-center gap-2 text-xs font-medium text-header-muted">
                        <span className="uppercase font-bold text-header-primary">{indicator.codigo}</span>
                        <span>{formatValue(indicator.codigo, indicator.valor)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
