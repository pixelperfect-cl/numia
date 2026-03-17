
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BentoCardProps {
    children: ReactNode;
    className?: string;
    title?: string;
    action?: ReactNode;
    noPadding?: boolean;
}

export function BentoCard({ children, className, title, action, noPadding = false }: BentoCardProps) {
    return (
        <div className={cn(
            "group relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col",
            // Base styles using semantic variables
            "bg-card/60 backdrop-blur-md border-border/50",
            // Hover effects
            "hover:border-primary/30 hover:shadow-lg dark:hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.1)]",
            className
        )}>
            {/* Cinematic ambient shine (Subtler in light mode) */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {(title || action) && (
                <div className="flex items-center justify-between p-5 pb-2 relative z-10 shrink-0">
                    {title && <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}

            <div className={cn("relative z-10 flex-1 min-h-0", !noPadding && !title && "p-5")}>
                {children}
            </div>
        </div>
    );
}
