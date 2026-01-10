import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Code2, Clock, Calendar, Info } from "lucide-react";
import { changelog, appStats, ChangeLogEntry } from "@/data/changelog";

export function ChangelogPanel() {
    const currentVersion = changelog[0]?.version || '0.0.0';

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'added': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'fixed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'changed': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'removed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'added': return 'Nuevo';
            case 'fixed': return 'Fix';
            case 'changed': return 'Cambio';
            case 'removed': return 'Eliminado';
            default: return type;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-1">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl flex items-center gap-2">
                                Versión {currentVersion}
                                <Badge variant="secondary" className="text-xs font-normal">SISTEMA</Badge>
                            </CardTitle>
                            <CardDescription>
                                Historial de cambios y estadísticas del proyecto
                            </CardDescription>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md border">
                                <Code2 className="h-4 w-4" />
                                <span className="text-sm font-mono font-bold">{appStats.loc.toLocaleString()} LOC</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md border">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-mono font-bold">+{appStats.devHours}h Dev</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {changelog.map((release: ChangeLogEntry, index: number) => (
                            <div key={release.version} className="relative pl-6 border-l-2 border-muted last:border-0 pb-6 last:pb-0">
                                {/* Timeline dot */}
                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/50'}`} />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                    <div>
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            v{release.version}
                                            {index === 0 && <Badge className="text-[10px] h-5">ACTUAL</Badge>}
                                        </h3>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {new Date(release.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {release.changes.map((change, i) => (
                                        <div key={i} className="flex gap-3 text-sm group items-start">
                                            <span className={`
                        shrink-0 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider h-fit mt-0.5 w-20 text-center
                        ${getTypeColor(change.type)}
                      `}>
                                                {getTypeLabel(change.type)}
                                            </span>
                                            <span className="text-muted-foreground group-hover:text-foreground transition-colors pt-0.5">
                                                {change.description}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
