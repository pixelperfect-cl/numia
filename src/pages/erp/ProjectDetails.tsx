import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getClient, subscribeToProject } from '@/lib/supabase/database';
import { Project, Client } from '@/types';
import { ProjectLayout } from '@/components/erp/project/ProjectLayout';
import { OverviewTab } from '@/components/erp/project/tabs/OverviewTab';
import { ProjectFinanceTab } from '@/components/erp/project/tabs/ProjectFinanceTab';
import { ProjectTasksTab } from '@/components/erp/project/tabs/ProjectTasksTab';
import { ProjectCredentialsTab } from '@/components/erp/project/tabs/ProjectCredentialsTab';
import { ProjectTeamTab } from '@/components/erp/project/tabs/ProjectTeamTab';
import { ProjectSettingsTab } from '@/components/erp/project/tabs/ProjectSettingsTab';
import { ActivityTab } from '@/components/erp/project/tabs/ActivityTab'; // Import new tab
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ProjectDetails() {
    // ... (state hooks remain same)
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (!projectId) return;

        const unsubscribe = subscribeToProject(projectId, async (p) => {
            if (p) {
                setProject(p);
                const c = await getClient(p.clientId);
                setClient(c);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const handleProjectUpdate = async (updatedProject: Project) => {
        setProject(updatedProject);
        // Optimistic client update or refetch
        if (updatedProject.clientId && (!client || updatedProject.clientId !== client.id)) {
            const c = await getClient(updatedProject.clientId);
            setClient(c);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!project) {
        return <div className="p-8 text-center">Proyecto no encontrado</div>;
    }

    return (
        <ProjectLayout project={project} clientName={client?.name || 'Cliente Desconocido'}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 bg-background py-3 border-b border-border/50 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
                    <TabsList className="bg-muted/50 p-1 rounded-lg hidden md:flex w-full justify-start">
                        <TabsTrigger value="overview" className="px-4 flex-1">General</TabsTrigger>
                        <TabsTrigger value="finance" className="px-4 flex-1">Finanzas</TabsTrigger>
                        <TabsTrigger value="tasks" className="px-4 flex-1">Tareas</TabsTrigger>
                        <TabsTrigger value="meetings" className="px-4 flex-1">Reuniones</TabsTrigger>
                        <TabsTrigger value="credentials" className="px-4 flex-1">Credenciales</TabsTrigger>
                        <TabsTrigger value="team" className="px-4 flex-1">Equipo</TabsTrigger>
                        <TabsTrigger value="activity" className="px-4 flex-1">Actividad</TabsTrigger>
                        <TabsTrigger value="settings" className="px-4 flex-1">Configuración</TabsTrigger>
                    </TabsList>

                    <div className="md:hidden w-full">
                        <Select value={activeTab} onValueChange={setActiveTab}>
                            <SelectTrigger className="w-full bg-muted/50 border-0 h-10">
                                <SelectValue placeholder="Seleccionar vista" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="overview">General</SelectItem>
                                <SelectItem value="finance">Finanzas</SelectItem>
                                <SelectItem value="tasks">Tareas</SelectItem>
                                <SelectItem value="meetings">Reuniones</SelectItem>
                                <SelectItem value="credentials">Credenciales</SelectItem>
                                <SelectItem value="team">Equipo</SelectItem>
                                <SelectItem value="activity">Actividad</SelectItem>
                                <SelectItem value="settings">Configuración</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    <TabsContent value="overview" className="outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-left-2">
                        <OverviewTab project={project} onUpdate={handleProjectUpdate} client={client} />
                    </TabsContent>

                    <TabsContent value="finance" className="outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-left-2">
                        <ProjectFinanceTab project={project} onProjectUpdate={handleProjectUpdate} />
                    </TabsContent>

                    <TabsContent value="tasks" className="outline-none mt-8">
                        <ProjectTasksTab project={project} onUpdate={handleProjectUpdate} />
                    </TabsContent>

                    <TabsContent value="meetings" className="outline-none mt-8">
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Gestión de Reuniones</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Esta funcionalidad estará disponible próximamente. Aquí podrás gestionar todas las reuniones relacionadas con este proyecto.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="credentials" className="outline-none mt-8">
                        <ProjectCredentialsTab project={project} onUpdate={handleProjectUpdate} />
                    </TabsContent>

                    <TabsContent value="team" className="outline-none mt-8">
                        <ProjectTeamTab project={project} onUpdate={handleProjectUpdate} />
                    </TabsContent>

                    <TabsContent value="activity" className="outline-none mt-8">
                        <ActivityTab project={project} client={client} />
                    </TabsContent>

                    <TabsContent value="settings" className="outline-none mt-8">
                        <ProjectSettingsTab project={project} onUpdate={handleProjectUpdate} />
                    </TabsContent>
                </div>
            </Tabs>
        </ProjectLayout>
    );
}
