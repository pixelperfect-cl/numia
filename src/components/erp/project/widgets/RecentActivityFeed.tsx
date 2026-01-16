import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageSquare, GitCommit, CheckCircle2, History } from "lucide-react";

export function RecentActivityFeed() {
    const activities = [
        { type: 'commit', user: 'Alex', action: 'pushed to main', time: '2h ago', icon: GitCommit, color: 'text-blue-500' },
        { type: 'comment', user: 'Sarah', action: 'commented on Task #42', time: '4h ago', icon: MessageSquare, color: 'text-amber-500' },
        { type: 'complete', user: 'Mike', action: 'completed Design Phase', time: 'Yesterday', icon: CheckCircle2, color: 'text-emerald-500' },
    ];

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Actividad Reciente
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative pl-4 border-l border-border/50 space-y-6">
                    {activities.map((activity, i) => (
                        <div key={i} className="relative">
                            <div className={`absolute -left-[21px] p-1 rounded-full bg-background border ${activity.color}`}>
                                <activity.icon className="h-3 w-3" />
                            </div>
                            <div className="text-sm">
                                <span className="font-medium text-foreground">{activity.user}</span>{' '}
                                <span className="text-muted-foreground">{activity.action}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{activity.time}</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
