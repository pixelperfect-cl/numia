import type { Project } from "@/types";
import { ProjectFinanceCard } from "../ProjectFinanceCard";

interface ProjectFinanceTabProps {
    project: Project;
}

export function ProjectFinanceTab({ project }: ProjectFinanceTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 gap-6">
                <ProjectFinanceCard project={project} />
            </div>
        </div>
    );
}
