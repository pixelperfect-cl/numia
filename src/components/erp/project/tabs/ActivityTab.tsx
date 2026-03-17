import { ActivityWidget } from "../widgets/ActivityWidget";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Project, Client } from "@/types";

interface ActivityTabProps {
    project: Project;
    client?: Client | null;
}

export function ActivityTab({ project }: ActivityTabProps) {
    return (
        <div className="space-y-6 h-full min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="h-full border-none shadow-sm bg-card/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium tracking-tight">Registro de Actividad</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100vh-300px)] min-h-[400px] p-0">
                    <div className="h-full rounded-md overflow-hidden">
                        <ActivityWidget
                            projectId={project.id}
                            hideComments={false} // Show comments in the full tab
                            className="h-full border-0 shadow-none"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
