import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Code2, Clock, Calendar, GitCommit } from "lucide-react";
import { changelog, appStats, ChangeLogEntry } from "@/data/changelog";

interface ChangelogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle className="text-2xl">Versión {currentVersion}</DialogTitle>
                        <Badge variant="outline" className="text-xs font-normal">SISTEMA</Badge>
                    </div>
                    <DialogDescription>
                        Historial de cambios y estadísticas del proyecto
                    </DialogDescription>
                </DialogHeader>

                {/* Stats Section */}
                <div className="grid grid-cols-2 gap-4 py-4 shrink-0">
                    <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Code2 className="h-4 w-4" />
                            <span className="text-xs uppercase font-semibold tracking-wider">Líneas de Código</span>
                        </div>
                        <span className="text-2xl font-mono font-bold">{appStats.loc.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs uppercase font-semibold tracking-wider">Horas Desarrollo</span>
                        </div>
                        <span className="text-2xl font-mono font-bold">+{appStats.devHours}h</span>
                    </div>
                </div>

                <Separator />

                <ScrollArea className="flex-1 pr-4 -mr-4">
                    <div className="space-y-8 py-4">
                        {changelog.map((release: ChangeLogEntry, index: number) => (
                            <div key={release.version} className="relative pl-4 border-l-2 border-muted last:border-0 pb-4 last:pb-0">
                                {/* Timeline dot */}
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-background ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/50'}`} />

                                <div className="flex items-start justify-between mb-2">
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

                                <div className="space-y-3 mt-3">
                                    {release.changes.map((change, i) => (
                                        <div key={i} className="flex gap-3 text-sm group">
                                            <span className={`
                        shrink-0 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider h-fit mt-0.5 w-16 text-center
                        ${getTypeColor(change.type)}
                      `}>
                                                {getTypeLabel(change.type)}
                                            </span>
                                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                                                {change.description}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
