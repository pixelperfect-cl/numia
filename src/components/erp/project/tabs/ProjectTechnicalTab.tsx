import type { Project } from "@/types";
import { EnvironmentStatusWidget } from "../widgets/EnvironmentStatus";
import { TechDetailsWidget } from "../widgets/TechDetailsWidget";

interface ProjectTechnicalTabProps {
    project: Project;
}

export function ProjectTechnicalTab({ project }: ProjectTechnicalTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <EnvironmentStatusWidget environments={project.environments} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TechDetailsWidget details={project.techDetails} />
            </div>
        </div>
    );
}
