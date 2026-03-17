
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProjectItem {
    id: string;
    name: string;
    client: string;
    status: 'planning' | 'in_progress' | 'review' | 'blocked' | 'completed';
    deadline: string;
}

const statusStyles = {
    planning: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_progress: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    blocked: "bg-destructive/10 text-destructive border-destructive/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const statusLabels = {
    planning: "Planning",
    in_progress: "Active",
    review: "In Review",
    blocked: "Blocked",
    completed: "Done",
};

export function ProjectList({ projects }: { projects: ProjectItem[] }) {
    const displayProjects = projects.slice(0, 5);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground tracking-wide">Project Priorities</h3>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary">
                    View All
                </Button>
            </div>

            <div className="space-y-1">
                {displayProjects.map((p) => {
                    const isUrgent = p.deadline.includes('Today') || p.deadline.includes('Tomorrow');

                    return (
                        <div key={p.id} className="group grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border text-sm">
                            {/* Project Name & Client */}
                            <div className="col-span-5 flex flex-col justify-center">
                                <span className="font-medium text-foreground truncate">{p.name}</span>
                                <span className="text-[10px] text-muted-foreground truncate">{p.client}</span>
                            </div>

                            {/* Status Badge */}
                            <div className="col-span-3">
                                <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
                                    statusStyles[p.status]
                                )}>
                                    {statusLabels[p.status]}
                                </span>
                            </div>

                            {/* Deadline */}
                            <div className={cn("col-span-3 text-right text-xs", isUrgent ? "text-destructive font-medium" : "text-muted-foreground")}>
                                {p.deadline}
                            </div>

                            {/* Action */}
                            <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground inline-block" />
                            </div>
                        </div>
                    );
                })}

                {displayProjects.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                        No active projects
                    </div>
                )}
            </div>
        </div>
    );
}
