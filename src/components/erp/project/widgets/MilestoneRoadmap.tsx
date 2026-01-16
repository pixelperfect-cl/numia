import { CheckCircle2, Circle, Clock, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectChecklist } from "@/types";

interface MilestoneRoadmapProps {
    checklists?: ProjectChecklist[];
}

export function MilestoneRoadmap({ checklists = [] }: MilestoneRoadmapProps) {
    if (checklists.length === 0) {
        return (
            <div className="w-full p-4 flex flex-col items-center justify-center border-b bg-muted/20">
                <div className="flex items-center gap-2 text-muted-foreground opacity-50">
                    <Flag className="h-5 w-5" />
                    <p className="text-sm">Añade listas de verificación para generar el mapa de hitos del proyecto.</p>
                </div>
            </div>
        );
    }

    const milestones = checklists.map(list => {
        const total = list.items.length;
        const completed = list.items.filter(i => i.completed).length;
        let status: 'pending' | 'active' | 'completed' = 'pending';

        if (total > 0) {
            if (completed === total) status = 'completed';
            else if (completed > 0) status = 'active';
        }

        return {
            title: list.title,
            status,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    });

    return (
        <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
            <div className="flex items-center justify-start min-w-[600px] relative px-4 py-6">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-muted -z-10 -translate-y-1/2" />

                <div className="flex justify-between w-full">
                    {milestones.map((step, index) => {
                        const isCompleted = step.status === 'completed';
                        const isActive = step.status === 'active';

                        return (
                            <div key={index} className="flex flex-col items-center gap-2 relative bg-background px-2 z-10 min-w-[100px]">
                                {isCompleted ? (
                                    <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                ) : isActive ? (
                                    <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 animate-pulse ring-4 ring-blue-500/20">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center">
                                        <Circle className="h-5 w-5 text-muted-foreground/40" />
                                    </div>
                                )}

                                <div className="text-center max-w-[120px]">
                                    <p className={cn(
                                        "text-sm font-medium truncate",
                                        isActive ? "text-blue-500" : isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                    )}>
                                        {step.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{step.progress}%</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
