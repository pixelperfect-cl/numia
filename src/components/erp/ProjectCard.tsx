import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Calendar, User, CheckSquare, Eye } from 'lucide-react';
import type { Project } from '@/types';
import { format, isPast, parseISO } from 'date-fns';

interface ProjectCardProps {
    project: Project;
    clientName: string;
    onEdit: (project: Project) => void;
    onDelete: (projectId: string) => void;
}

export function ProjectCard({ project, clientName, onEdit, onDelete }: ProjectCardProps) {
    const isOverdue = project.dueDate && isPast(parseISO(project.dueDate)) && project.status !== 'completed';

    // Calculate checklist progress dynamically
    const totalChecklistItems = project.checklists?.reduce((acc, list) => acc + list.items.length, 0) || 0;
    const completedChecklistItems = project.checklists?.reduce((acc, list) => acc + list.items.filter(i => i.completed).length, 0) || 0;
    const checklistProgress = totalChecklistItems > 0
        ? Math.round((completedChecklistItems / totalChecklistItems) * 100)
        : project.progress;

    // Calculate time progress using startDate (fallback to createdAt)
    const calculateTimeProgress = () => {
        if (!project.dueDate) return 0;
        const startRef = project.startDate || (project.createdAt ? project.createdAt.toString() : null);
        if (!startRef) return 0;
        const start = new Date(startRef);
        const end = parseISO(project.dueDate);
        const now = new Date();
        const totalDuration = end.getTime() - start.getTime();
        if (totalDuration <= 0) return 100;
        const elapsed = now.getTime() - start.getTime();
        return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    };
    const timeProgress = calculateTimeProgress();

    return (
        <Card
            className="mb-2 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => onEdit(project)}
        >
            <CardContent className="p-2 space-y-1.5">
                {/* Logo */}
                {project.logoUrl && (
                    <img
                        src={project.logoUrl}
                        alt={project.name}
                        className="-mt-2 max-h-14 max-w-full w-auto object-contain mx-auto block"
                    />
                )}
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        {!project.logoUrl && (
                            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary/70">{project.name.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate bg-transparent">{project.name}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <User className="h-3 w-3" />
                                <span className="truncate">{clientName}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(project);
                            }}
                        >
                            <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-red-500 hover:text-red-600"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(project.id);
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>



                {/* Stats / Progress */}
                {(project.checklists && project.checklists.length > 0) ? (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Progreso</span>
                            <span className="font-medium">{checklistProgress}%</span>
                        </div>
                        <Progress
                            value={checklistProgress}
                            className="h-1"
                            indicatorClassName="bg-[#008bff] shadow-[0_0_8px_#008bff]"
                        />
                    </div>
                ) : null}

                {/* Footer: Date & Avatar (Simulated) */}
                <div className="flex items-center justify-between pt-1">
                    {project.dueDate ? (
                        <div className={`flex items-center gap-1 text-[10px] border rounded px-1.5 py-0.5 ${isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900' : 'text-muted-foreground border-transparent bg-muted/50'}`}>
                            <Calendar className="h-3 w-3" />
                            <span>{format(parseISO(project.dueDate), 'dd MMM')}</span>
                        </div>
                    ) : (
                        <div />
                    )}

                    {totalChecklistItems > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-transparent">
                            <CheckSquare className="h-3 w-3" />
                            <span>{completedChecklistItems}/{totalChecklistItems}</span>
                        </div>
                    )}
                </div>

                {/* Time Tracking Bar */}
                {project.dueDate && (
                    <div className="pt-1">
                        <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${isOverdue ? 'bg-destructive' : 'bg-blue-400/70'}`}
                                style={{ width: `${timeProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


