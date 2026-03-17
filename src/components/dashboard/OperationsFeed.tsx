
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface FeedItem {
    id: string;
    title: string;
    time: string;
    icon: LucideIcon;
    color: string; // Tailwind text color class
}

interface OperationsFeedProps {
    items: FeedItem[];
}

export function OperationsFeed({ items }: OperationsFeedProps) {
    return (
        <div className="h-full w-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Operations</h3>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="relative flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Timeline Line */}
                <div className="absolute left-[11px] top-2 bottom-0 w-[1px] bg-border" />

                {items.map((item) => (
                    <div key={item.id} className="relative pl-8 group">
                        {/* Icon Node */}
                        <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center z-10 transition-colors group-hover:border-foreground/20">
                            <item.icon className={cn("h-3 w-3 transition-all group-hover:scale-110", item.color)} />
                        </div>

                        {/* Content */}
                        <div>
                            <p className="text-xs text-foreground font-medium leading-tight opacity-80 group-hover:opacity-100 transition-opacity">
                                {item.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">{item.time}</p>
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <p className="text-xs text-muted-foreground pl-8">No recent activity detected.</p>
                )}
            </div>
        </div>
    );
}
