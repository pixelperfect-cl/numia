import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Server } from "lucide-react";
import { cn } from "@/lib/utils";

interface Environment {
    name: 'production' | 'staging' | 'dev';
    status: 'healthy' | 'degraded' | 'down';
    url?: string;
    uptime?: number;
    version?: string;
}

interface EnvironmentStatusWidgetProps {
    environments?: Environment[];
}

export function EnvironmentStatusWidget({ environments }: EnvironmentStatusWidgetProps) {
    const displayEnvs: Environment[] = environments || [];

    if (displayEnvs.length === 0) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
            case 'degraded': return "text-amber-500 bg-amber-500/10 border-amber-500/20";
            case 'down': return "text-red-500 bg-red-500/10 border-red-500/20";
            default: return "text-muted-foreground bg-muted border-muted";
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {displayEnvs.map((env) => (
                <Card key={env.name}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold capitalize text-sm">{env.name}</span>
                            </div>
                            <Badge variant="outline" className={cn("capitalize border", getStatusColor(env.status))}>
                                {env.status}
                            </Badge>
                        </div>

                        <div className="space-y-1">
                            {env.version && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Version</span>
                                    <span className="font-mono">{env.version}</span>
                                </div>
                            )}
                            {env.uptime && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Uptime</span>
                                    <span className={cn(env.uptime > 99 ? "text-emerald-500" : "text-amber-500")}>
                                        {env.uptime}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
