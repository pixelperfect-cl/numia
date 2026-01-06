import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Calendar, User } from 'lucide-react';
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

    return (
        <Card className="mb-3 hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{project.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <User className="h-3 w-3" />
                            <span className="truncate">{clientName}</span>
                        </div>
                    </div>
                    <div className="flex gap-1 -mr-2 -mt-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onEdit(project)}
                        >
                            <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600"
                            onClick={() => onDelete(project.id)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* Description (Optional) */}
                {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {project.description}
                    </p>
                )}

                {/* Stats / Progress */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-1.5" />
                </div>

                {/* Footer: Date & Avatar (Simulated) */}
                <div className="flex items-center justify-between pt-1">
                    {project.dueDate ? (
                        <div className={`flex items-center gap-1 text-xs border rounded px-1.5 py-0.5 ${isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900' : 'text-muted-foreground border-transparent bg-muted/50'}`}>
                            <Calendar className="h-3 w-3" />
                            <span>{format(parseISO(project.dueDate), 'dd MMM')}</span>
                        </div>
                    ) : (
                        <div />
                    )}

                    {/* Avatar simulation using initials */}
                    {/* <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
             {clientName.substring(0, 2).toUpperCase()}
          </div> */}
                </div>
            </CardContent>
        </Card>
    );
}
