import type { Project, Client } from "@/types";
import { ProjectOverview } from "../ProjectOverview";

import { CredentialsWidget } from "../widgets/CredentialsWidget";
import { TeamWidget } from "../widgets/TeamWidget";
import { ClientInfoWidget } from "../widgets/ClientInfoWidget";
import { ActivityWidget } from "../widgets/ActivityWidget";

interface ProjectGeneralTabProps {
    project: Project;
    onUpdate: (project: Project) => void;
    client?: Client | null;
}

import { useAuth } from "@/contexts/AuthContext";
import { logProjectActivity } from "@/lib/activityUtils";

interface ProjectGeneralTabProps {
    project: Project;
    onUpdate: (project: Project) => void;
    client?: Client | null;
}

export function ProjectGeneralTab({ project, onUpdate, client }: ProjectGeneralTabProps) {
    const { user } = useAuth();

    const handleClientChange = async (newClient: Client) => {
        // Optimistic update locally? 
        // We need to update the PROJECT with the new clientId
        // The parent onUpdate handles the project update in DB

        try {
            // Import database functions dynamically to avoid circular dependencies if any
            const { updateProject } = await import('@/lib/supabase/database');
            await updateProject(project.id, { clientId: newClient.id });

            // Notify parent to refresh/set local state
            // We construct a new project object, but really the parent subscription should catch it.
            // However, to be snappy, we might want to call onUpdate.
            onUpdate({ ...project, clientId: newClient.id });

            if (user) {
                await logProjectActivity(
                    project.id,
                    'status_change', // Using status_change as generic update for now
                    `Cliente asignado: ${newClient.name}`,
                    user.uid,
                    user.displayName || 'Usuario'
                );
            }

        } catch (error) {
            console.error("Failed to update client", error);
        }
    };

    const handleTeamUpdate = async (newTeam: any[]) => {
        try {
            const { updateProject } = await import('@/lib/supabase/database');
            await updateProject(project.id, { team: newTeam });
            onUpdate({ ...project, team: newTeam });
        } catch (error) {
            console.error("Failed to update team", error);
        }
    };

    const handleCredentialsUpdate = async (newCreds: any[]) => {
        try {
            const { updateProject } = await import('@/lib/supabase/database');
            await updateProject(project.id, { credentials: newCreds });
            onUpdate({ ...project, credentials: newCreds });
        } catch (error) {
            console.error("Failed to update credentials", error);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-300">
            {/* Main Content (Left - 2/3) */}
            <div className="lg:col-span-2 space-y-8">
                <ProjectOverview project={project} onUpdate={onUpdate} />
            </div>

            <div className="space-y-6 sticky top-24">
                <ClientInfoWidget client={client} onClientChange={handleClientChange} />
                <TeamWidget team={project.team} onUpdate={handleTeamUpdate} projectId={project.id} />
                <CredentialsWidget credentials={project.credentials} onUpdate={handleCredentialsUpdate} projectId={project.id} />
                <ActivityWidget projectId={project.id} />
            </div>
        </div>
    );
}

