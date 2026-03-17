import { useState } from 'react';
import { Project } from '@/types';
import { updateProject } from '@/lib/supabase/database';
import { TeamWidget, TeamMember } from "../widgets/TeamWidget";

interface ProjectTeamTabProps {
    project: Project;
    onUpdate: (updatedProject: Project) => void;
}

export function ProjectTeamTab({ project, onUpdate }: ProjectTeamTabProps) {

    const handleTeamUpdate = async (newTeam: TeamMember[]) => {
        try {
            await updateProject(project.id, { team: newTeam });
            onUpdate({ ...project, team: newTeam });
        } catch (error) {
            console.error("Failed to update team", error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold tracking-tight">Equipo del Proyecto</h3>
                <p className="text-sm text-muted-foreground">
                    Gestiona los miembros del equipo asignados a este proyecto.
                </p>
            </div>

            {/* Reusing TeamWidget for now as it contains all necessary logic (Add, Edit, Delete, Activity Log) */}
            {/* We can expand this later to be a grid view if needed */}
            <div className="max-w-2xl">
                <TeamWidget
                    team={project.team}
                    onUpdate={handleTeamUpdate}
                    projectId={project.id}
                />
            </div>
        </div>
    );
}
