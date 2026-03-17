import { Project, Client } from '@/types';
import { ProjectOverview } from '../ProjectOverview';
import { ProjectDetailsWidget } from "../widgets/ProjectDetailsWidget";
import { useAuth } from "@/contexts/AuthContext";
import { logProjectActivity } from "@/lib/activityUtils";
import { updateProject } from '@/lib/supabase/database';

interface OverviewTabProps {
    project: Project;
    onUpdate: (updatedProject: Project) => void;
    client?: Client | null;
}

export function OverviewTab({ project, onUpdate, client }: OverviewTabProps) {
    const { user } = useAuth();

    const handleClientChange = async (newClient: Client) => {
        try {
            await updateProject(project.id, { clientId: newClient.id });
            onUpdate({ ...project, clientId: newClient.id });

            if (user) {
                await logProjectActivity(
                    project.id,
                    'status_change',
                    `Cliente asignado: ${newClient.name}`,
                    user.uid,
                    user.displayName || 'Usuario'
                );
            }
        } catch (error) {
            console.error("Failed to update client", error);
        }
    };



    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Content (Left - 2/3) - Description */}
            <div className="lg:col-span-2 flex flex-col">
                <ProjectOverview project={project} onUpdate={onUpdate} />
            </div>

            {/* Sidebar Widgets (Right - 1/3) - Client Info & Activity */}
            <div className="space-y-6 h-full flex flex-col">
                <ProjectDetailsWidget
                    project={project}
                    client={client}
                    onUpdate={onUpdate}
                    onClientChange={handleClientChange}
                />
            </div>
        </div>
    );
}
