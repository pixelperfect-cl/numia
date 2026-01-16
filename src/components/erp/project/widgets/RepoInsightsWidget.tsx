import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, GitPullRequest, GitCommit } from "lucide-react";

export function RepoInsightsWidget() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardContent className="p-4 flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> Active Branches
                    </span>
                    <span className="text-2xl font-bold">12</span>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3" /> Open PRs
                    </span>
                    <span className="text-2xl font-bold text-amber-500">3</span>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GitCommit className="h-3 w-3" /> Commits (7d)
                    </span>
                    <span className="text-2xl font-bold">45</span>
                </CardContent>
            </Card>
        </div>
    );
}
