import { useState, useEffect } from 'react';
import * as React from 'react';
import { CustomScrollbar } from '@/components/ui/CustomScrollbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Archive, RotateCcw, Trash2, SquareKanban, Bell } from 'lucide-react';
import { NotificationSettings } from '@/components/configuration/NotificationSettings';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects, getClients, deleteProject, updateProject } from '@/lib/supabase/database';
import { sendTriggerEmail } from '@/lib/notifications/triggers';
import type { Project, ProjectStatus, ProjectList } from '@/types';
import { ProjectDialog } from '@/components/erp/ProjectDialog';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    closestCorners,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { KanbanColumn } from '@/components/erp/KanbanColumn';
import { SortableProjectCard } from '@/components/erp/SortableProjectCard';
import { ProjectListDialog } from '@/components/erp/ProjectListDialog';
import { ProjectCreationWizard } from '@/components/erp/ProjectCreationWizard';

import { getProjectLists, createProjectList, updateProjectList, deleteProjectList, initializeDefaultProjectLists } from '@/lib/supabase/database';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectsProps {
    entityId?: string;
}

export function Projects({ entityId }: ProjectsProps = {}) {
    const { user } = useAuth();
    const { entities } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'active'; // 'summary' | 'active' | 'archived' | 'notifications'

    const activeEntity = entities.find(e => e.id === (entityId || entities[0]?.id));

    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Record<string, string>>({}); // Map id -> name
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
    const [activeId, setActiveId] = useState<string | null>(null);

    // List Management State
    const [projectLists, setProjectLists] = useState<ProjectList[]>([]);
    const [listDialogOpen, setListDialogOpen] = useState(false);
    const [editingList, setEditingList] = useState<ProjectList | undefined>(undefined);

    // Drag to scroll state
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts (prevents accidental clicks)
            },
        })
    );

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only trigger scroll drag if clicking on the background (not on a card)
        // This is a simple check; dnd-kit events on cards might stop propagation anyway
        if ((e.target as HTMLElement).closest('.touch-none')) return;

        setIsDragging(true);
        setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
        setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
        const walk = (x - startX) * 2; // Scroll-fast speed
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollLeft - walk;
        }
    };

    const columns = projectLists;

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (!user) return;

            const [projectsData, clientsData, listsData] = await Promise.all([
                getProjects(user.uid),
                getClients(user.uid),
                getProjectLists(user.uid)
            ]);

            setProjects(projectsData);

            const clientMap: Record<string, string> = {};
            clientsData.forEach(c => clientMap[c.id] = c.name);
            setClients(clientMap);

            if (listsData.length === 0) {
                await initializeDefaultProjectLists(user.uid);
                const initializedLists = await getProjectLists(user.uid);
                setProjectLists(initializedLists);
            } else {
                setProjectLists(listsData);
            }

        } catch (error) {
            console.error("Error loading projects/clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (projectId: string) => {
        if (!confirm('¿Estás seguro de eliminar este proyecto permanentemente?')) return;
        try {
            await deleteProject(projectId);
            loadData();
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

    const handleArchive = async (project: Project) => {
        const isArchiving = !project.archived;
        const message = isArchiving
            ? '¿Estás seguro de archivar este proyecto? Dejará de aparecer en el tablero activo.'
            : '¿Estás seguro de restaurar este proyecto? Volverá al tablero activo.';

        if (!confirm(message)) return;

        try {
            await updateProject(project.id, {
                archiveDate: isArchiving ? new Date().toISOString() : null as any
            });
            loadData();
        } catch (error) {
            console.error("Error archiving/restoring project:", error);
        }
    };

    const [wizardOpen, setWizardOpen] = useState(false);

    const handleAddNew = (status: ProjectStatus) => {
        // We might want to pass status to the wizard, but for now it starts with client selection
        // The wizard defaults to 'incoming' or we can add that prop later if needed
        setWizardOpen(true);
    };

    const handleEditList = (listId: string) => {
        const list = projectLists.find(l => l.id === listId);
        if (list) {
            setEditingList(list);
            setListDialogOpen(true);
        }
    };

    const handleDeleteList = async (listId: string) => {
        // Validation: Cannot delete if has projects
        const hasProjects = projects.some(p => p.status === listId && !p.archived);
        if (hasProjects) {
            alert('No puedes eliminar un flujo que contiene proyectos activos. Mueve los proyectos primero.');
            return;
        }

        if (!confirm('¿Estás seguro de eliminar este flujo?')) return;

        try {
            await deleteProjectList(listId);
            loadData();
        } catch (error) {
            console.error("Error deleting list:", error);
        }
    };

    const handleCreateList = () => {
        setEditingList(undefined);
        setListDialogOpen(true);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const projectId = active.id as string;
            const newStatus = over.id as ProjectStatus;
            const prevProject = projects.find(p => p.id === projectId);

            // Optimistic update
            setProjects(projects.map(p =>
                p.id === projectId ? { ...p, status: newStatus } : p
            ));

            try {
                await updateProject(projectId, { status: newStatus });
                if (prevProject && prevProject.status !== newStatus) {
                    // Fire-and-forget project_status email (no await — UI mustn't block on email).
                    void sendTriggerEmail({
                        projectId,
                        statusId: newStatus,
                        triggerType: 'project_status',
                    });
                }
            } catch (error) {
                console.error("Error updating project status:", error);
                // Revert on error - reloading data is easiest
                loadData();
            }
        }
        setActiveId(null);
    };

    const activeProject = activeId ? projects.find(p => p.id === activeId) : null;

    // Filter projects based on tab and active status
    const allProjects = projects;
    const activeProjects = projects.filter(p => !p.archived);
    const archivedProjects = projects.filter(p => p.archived);

    const filteredActiveProjects = activeProjects.filter(project =>
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clients[project.clientId] || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredArchivedProjects = archivedProjects.filter(project =>
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clients[project.clientId] || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Summary Calculations
    const totalActive = activeProjects.length;
    const totalArchived = archivedProjects.length;
    const projectsByStatus = projectLists.map(list => ({
        name: list.title,
        count: activeProjects.filter(p => p.status === list.id).length,
        color: list.color
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {currentTab === 'summary' && 'Resumen de Proyectos'}
                        {currentTab === 'active' && 'Tablero de Proyectos'}
                        {currentTab === 'archived' && 'Proyectos Archivados'}
                        {currentTab === 'notifications' && 'Plantillas de Email'}
                    </h1>
                    <p className="text-muted-foreground">
                        {currentTab === 'summary' && 'Vista general del estado de tus proyectos'}
                        {currentTab === 'active' && 'Gestiona tus proyectos activos y flujo de trabajo'}
                        {currentTab === 'archived' && 'Historial de proyectos finalizados o cancelados'}
                        {currentTab === 'notifications' && 'Correos automáticos al cambiar de estado'}
                    </p>
                </div>
                {currentTab !== 'summary' && currentTab !== 'notifications' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar proyecto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Summary View */}
            {currentTab === 'summary' && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
                                <SquareKanban className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalActive}</div>
                                <p className="text-xs text-muted-foreground">En curso actualmente</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Proyectos Archivados</CardTitle>
                                <Archive className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalArchived}</div>
                                <p className="text-xs text-muted-foreground">Finalizados o cancelados</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Estado de Proyectos Activos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {projectsByStatus.map(status => (
                                    <div key={status.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${status.color?.includes('bg-') ? status.color.split(' ')[0] : 'bg-primary'}`} />
                                            <span>{status.name}</span>
                                        </div>
                                        <span className="font-bold">{status.count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Active Kanban View */}
            {currentTab === 'active' && (
                <>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <CustomScrollbar scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement>} deps={[columns]} />
                        <div
                            ref={scrollContainerRef}
                            className="flex gap-4 items-start overflow-x-auto pb-4 cursor-grab active:cursor-grabbing min-h-[calc(100vh-12rem)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseLeave}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                        >
                            {columns.map((column, index) => (
                                <KanbanColumn
                                    key={column.id}
                                    id={column.id}
                                    title={column.title}
                                    color={column.color || 'bg-slate-500/10 border-slate-500/20'}
                                    projects={filteredActiveProjects.filter(p => {
                                        // Standard match: status matches column ID
                                        if (p.status === column.id) return true;

                                        // Legacy/Orphan match: if this is the first column, 
                                        // capture all projects whose status DOES NOT match any existing list key
                                        // This creates a "catch-all" for legacy data or mismatched UUIDs
                                        if (index === 0) {
                                            const allListIds = columns.map(c => c.id);
                                            // Iterate the other columns - if status matches NO known column ID, it belongs here
                                            return !allListIds.includes(p.status);
                                        }
                                        return false;
                                    })}
                                    clients={clients}
                                    loading={loading}
                                    onEdit={(project) => {
                                        navigate(`/erp/projects/${project.id}`);
                                    }}
                                    onDelete={(projectId) => {
                                        const project = projects.find(p => p.id === projectId);
                                        if (project) handleArchive(project);
                                    }}
                                    onAdd={() => handleAddNew(column.id)}
                                    onEditList={handleEditList}
                                    onDeleteList={handleDeleteList}
                                />
                            ))}

                            {/* Add List Button */}
                            <div className="flex-none w-[280px] pt-2">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 border-dashed bg-transparent hover:bg-slate-500/5 text-muted-foreground hover:text-foreground"
                                    onClick={handleCreateList}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Añadir Flujo
                                </Button>
                            </div>
                        </div>

                        <DragOverlay>
                            {activeProject ? (
                                <SortableProjectCard
                                    project={activeProject}
                                    clientName={clients[activeProject.clientId] || 'Cliente desconocido'}
                                    onEdit={() => { }}
                                    onDelete={() => { }}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    <ProjectCreationWizard
                        open={wizardOpen}
                        onOpenChange={setWizardOpen}
                        onSuccess={loadData}
                    />

                    <ProjectListDialog
                        open={listDialogOpen}
                        onOpenChange={setListDialogOpen}
                        list={editingList}
                        onSuccess={loadData}
                        currentOrder={projectLists.length}
                    />
                </>
            )}

            {/* Archived View */}
            {currentTab === 'archived' && (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Proyecto</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Fecha Archivado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredArchivedProjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No hay proyectos archivados
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredArchivedProjects.map((project) => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium">{project.name}</TableCell>
                                            <TableCell>{clients[project.clientId] || 'Desconocido'}</TableCell>
                                            <TableCell>
                                                {project.archiveDate
                                                    ? format(new Date(project.archiveDate), 'dd MMM yyyy', { locale: es })
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleArchive(project)}
                                                        title="Restaurar"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(project.id)}
                                                        title="Eliminar permanentemente"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {currentTab === 'notifications' && (
                activeEntity ? (
                    <NotificationSettings entity={activeEntity} scope="projects" />
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Selecciona una entidad para configurar plantillas.</p>
                    </div>
                )
            )}

        </div >
    );
}
