import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MoreVertical, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectHeaderProps {
    project: Project;
    clientName: string;
}

export function ProjectHeader({ project, clientName }: ProjectHeaderProps) {
    const navigate = useNavigate();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25';
            case 'in_progress': return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25';
            case 'review': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25';
            case 'incoming': return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 hover:bg-slate-500/25';
            default: return 'bg-slate-500/15 text-slate-700 dark:text-slate-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Completado';
            case 'in_progress': return 'En Curso';
            case 'review': return 'Revisión';
            case 'incoming': return 'Por Iniciar';
            default: return status;
        }
    };

    return (
        <div className="flex items-center justify-between py-2 px-1 gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center gap-2 min-w-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => navigate('/erp/projects')}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold tracking-tight truncate">
                            {project.name}
                        </h1>
                        <Badge variant="secondary" className={`capitalize px-2 py-0 h-5 text-[10px] font-medium border-0 ${getStatusColor(project.status)}`}>
                            {getStatusLabel(project.status)}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <span className="font-medium text-primary/80 hover:text-primary transition-colors cursor-pointer">
                            {clientName}
                        </span>
                        {project.dueDate && (
                            <>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(parseISO(project.dueDate), "d 'de' MMMM", { locale: es })}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {/* Actions can go here */}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
