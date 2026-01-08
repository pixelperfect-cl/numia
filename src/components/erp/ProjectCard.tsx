import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
    const progressColor = project.status === 'completed' ? 'bg-green-500' : 'bg-primary';

    // Calculate checklist progress
    const totalChecklistItems = project.checklists?.reduce((acc, list) => acc + list.items.length, 0) || 0;
    const completedChecklistItems = project.checklists?.reduce((acc, list) => acc + list.items.filter(i => i.completed).length, 0) || 0;

    return (
        <Card
            className="mb-2 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => onEdit(project)}
        >
            <CardContent className="p-2 space-y-1.5">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate bg-transparent">{project.name}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <User className="h-3 w-3" />
                            <span className="truncate">{clientName}</span>
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

                {/* Description (Optional) */}
                {project.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                        {project.description}
                    </p>
                )}

                {/* Stats / Progress */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress
                        value={project.progress}
                        className="h-1"
                        indicatorClassName="bg-[#008bff] shadow-[0_0_8px_#008bff]"
                    />
                </div>

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
            </CardContent>
        </Card>
    );
}
