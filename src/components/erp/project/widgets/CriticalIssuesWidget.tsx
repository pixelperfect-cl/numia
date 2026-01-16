import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, ShieldAlert } from "lucide-react";

export function CriticalIssuesWidget() {
    return (
        <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600 dark:text-red-400">
                    <ShieldAlert className="h-4 w-4" />
                    Problemas Críticos
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm bg-background p-3 rounded-md border border-red-500/10">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium text-foreground">API Latency Warning</p>
                            <p className="text-xs text-muted-foreground">High response times on /checkout endpoint (&gt;2s)</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <span className="text-xs text-muted-foreground">Todos los sistemas operativos</span>
                </div>
            </CardContent>
        </Card>
    );
}
