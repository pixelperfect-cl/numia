import { Project } from '@/types';
import { CredentialsWidget, Credential } from "../widgets/CredentialsWidget";
import { updateProject } from '@/lib/supabase/database';

interface ProjectCredentialsTabProps {
    project: Project;
    onUpdate: (updatedProject: Project) => void;
}

export function ProjectCredentialsTab({ project, onUpdate }: ProjectCredentialsTabProps) {

    const handleCredentialsUpdate = async (newCreds: Credential[]) => {
        try {
            await updateProject(project.id, { credentials: newCreds });
            onUpdate({ ...project, credentials: newCreds });
        } catch (error) {
            console.error("Failed to update credentials", error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold tracking-tight">Credenciales del Proyecto</h3>
                <p className="text-sm text-muted-foreground">
                    Gestiona los accesos y credenciales importantes para este proyecto.
                </p>
            </div>

            <CredentialsWidget
                credentials={project.credentials}
                onUpdate={handleCredentialsUpdate}
                projectId={project.id}
            />
        </div>
    );
}
