import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/types';
import { Clock, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays, differenceInBusinessDays, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimeTrackingWidgetProps {
    project: Project;
    onUpdate?: (project: Project) => void;
}

export function TimeTrackingWidget({ project, onUpdate }: TimeTrackingWidgetProps) {
    const handleDateSelect = async (date: Date | undefined) => {
        if (!date) return;
        const isoDate = date.toISOString();

        try {
            await updateProject(project.id, { dueDate: isoDate });
            if (onUpdate) {
                onUpdate({ ...project, dueDate: isoDate });
            }
            // Notify header and other listeners that project data changed
            window.dispatchEvent(new CustomEvent('project-updated', { detail: { projectId: project.id } }));
        } catch (error) {
            console.error("Failed to update due date", error);
        }
    };

    if (!project.dueDate) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Seguimiento de Tiempo
                        </div>
                        {onUpdate && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <CalendarComponent
                                        mode="single"
                                        selected={undefined}
                                        onSelect={handleDateSelect}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 min-h-[100px] justify-center text-center">
                        <p>No hay fecha de entrega definida para este proyecto.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const startDate = project.startDate ? parseISO(project.startDate) : (project.createdAt ? parseISO(project.createdAt.toString()) : new Date());
    const dueDate = parseISO(project.dueDate);
    const today = new Date();

    const totalDays = differenceInDays(dueDate, startDate);
    const daysElapsed = differenceInDays(today, startDate);
    const daysRemaining = differenceInDays(dueDate, today);

    // Ensure accurate progress calculation
    const progress = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 100);

    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isDueToday = isToday(dueDate);

    let statusColor = "bg-primary";
    let statusTextColor = "text-primary";
    let statusText = "En Tiempo";
    let Icon = Clock;

    if (isOverdue) {
        statusColor = "bg-destructive";
        statusTextColor = "text-destructive";
        statusText = "Retrasado";
        Icon = AlertTriangle;
    } else if (isDueToday) {
        statusColor = "bg-orange-500";
        statusTextColor = "text-orange-500";
        statusText = "Entrega Hoy";
        Icon = AlertTriangle;
    } else if (progress > 90) {
        statusColor = "bg-orange-500";
        statusTextColor = "text-orange-500";
        statusText = "En Riesgo";
        Icon = AlertTriangle;
    } else {
        Icon = CheckCircle2;
        statusColor = "bg-emerald-500";
        statusTextColor = "text-emerald-500";
    }

    return (
        <Card className="h-full border-none shadow-none bg-muted/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Tiempo Restante
                    </div>

                    <div className="flex items-center gap-2">
                        {statusText && (
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-background border ${statusTextColor} border-current opacity-80`}>
                                {statusText}
                            </span>
                        )}

                        {onUpdate && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <CalendarComponent
                                        mode="single"
                                        selected={project.dueDate ? parseISO(project.dueDate) : undefined}
                                        onSelect={handleDateSelect}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center py-2">
                    <span className={`text-4xl font-bold ${isOverdue ? "text-destructive" : "text-foreground"}`}>
                        {isOverdue ? Math.abs(daysRemaining) : daysRemaining}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">
                        Días {isOverdue ? "de Retraso" : "Restantes"}
                    </span>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progreso Temporal</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" indicatorClassName={isOverdue ? "bg-destructive" : undefined} />
                    <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                        <span>Inicio: {format(startDate, "d MMM", { locale: es })}</span>
                        <span>Fin: {format(dueDate, "d MMM", { locale: es })}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { updateProject } from '@/lib/supabase/database';
import { useState } from 'react';
