import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Database, Server, GitBranch } from "lucide-react";

interface TechDetails {
    stack?: string[];
    repoUrl?: string;
    hosting?: string;
    database?: string;
}

interface TechDetailsWidgetProps {
    details?: TechDetails;
}

export function TechDetailsWidget({ details }: TechDetailsWidgetProps) {
    if (!details) return null;

    const stack = details.stack || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Ficha Técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {stack.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Code2 className="h-3 w-3" /> Stack Tecnológico
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {stack.map((tech, i) => (
                                <span key={i} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] font-medium border border-border/50">
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    {details.hosting && (
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Server className="h-3 w-3" /> Hosting
                            </span>
                            <p className="text-sm font-medium">{details.hosting}</p>
                        </div>
                    )}
                    {details.database && (
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Database className="h-3 w-3" /> Base de Datos
                            </span>
                            <p className="text-sm font-medium">{details.database}</p>
                        </div>
                    )}
                </div>

                {details.repoUrl && (
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <GitBranch className="h-3 w-3" /> Repositorio
                        </span>
                        <a href={details.repoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline truncate block">
                            {details.repoUrl}
                        </a>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
