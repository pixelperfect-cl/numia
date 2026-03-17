
import { cn } from '@/lib/utils';
import { ArrowUpRight, CheckCircle2, MessageSquare, Plus, RefreshCcw } from 'lucide-react';

export function GrowthWidget() {
    // Mock Pipeline Data
    const stages = [
        { label: "Lead", value: 12, color: "bg-blue-500" },
        { label: "Meeting", value: 8, color: "bg-indigo-500" },
        { label: "Proposal", value: 5, color: "bg-violet-500" },
        { label: "Negotiation", value: 3, color: "bg-fuchsia-500" },
        { label: "Closed", value: 18, color: "bg-emerald-500" }, // This month
    ];

    const maxValue = Math.max(...stages.map(s => s.value));

    // Mock Activity Data
    const activities = [
        { icon: MessageSquare, text: "New proposal sent to Pixel Perfect", time: "2h ago", color: "text-blue-400" },
        { icon: RefreshCcw, text: "Subscription renewed for TechCorp", time: "4h ago", color: "text-emerald-400" },
        { icon: Plus, text: "New project created: Website Redesign", time: "5h ago", color: "text-indigo-400" },
        { icon: CheckCircle2, text: "Invoice #1092 marked as paid", time: "1d ago", color: "text-emerald-400" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">

            {/* Left: Sales Pipeline */}
            <div className="flex flex-col h-full bg-white/5 rounded-lg p-5 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-sm font-semibold tracking-wide">Sales Pipeline</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">32 Active Opportunities</p>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium">
                        +15% MoM
                    </div>
                </div>

                <div className="space-y-3 flex-1">
                    {stages.map((stage) => (
                        <div key={stage.label} className="group">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">{stage.label}</span>
                                <span className="font-mono">{stage.value}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full opacity-80 group-hover:opacity-100 transition-all", stage.color)}
                                    style={{ width: `${(stage.value / maxValue) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Activity Feed */}
            <div className="flex flex-col h-full bg-white/5 rounded-lg p-5 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold tracking-wide">Recent Activity</h3>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Live Feed</span>
                </div>

                <div className="space-y-0 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-white/10" />

                    {activities.map((act, i) => (
                        <div key={i} className="relative pl-8 py-2 group">
                            <div className={cn(
                                "absolute left-0 top-3 h-5 w-5 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center z-10",
                                act.color
                            )}>
                                <act.icon className="h-2.5 w-2.5" />
                            </div>
                            <div>
                                <p className="text-xs text-foreground group-hover:text-white transition-colors">
                                    {act.text}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{act.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
