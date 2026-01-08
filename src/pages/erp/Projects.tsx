import { useState, useEffect } from 'react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects, getClients, deleteProject, updateProject } from '@/lib/firebase/database';
import type { Project, ProjectStatus } from '@/types';
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

interface ProjectsProps {
    entityId?: string;
}

export function Projects({ entityId }: ProjectsProps = {}) {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Record<string, string>>({}); // Map id -> name
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
    const [activeId, setActiveId] = useState<string | null>(null);

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

    const columns: { id: ProjectStatus; title: string, color: string }[] = [
        { id: 'incoming', title: 'Incoming', color: 'bg-slate-500/10 border-slate-500/20' },
        { id: 'design', title: 'Diseño', color: 'bg-slate-500/10 border-slate-500/20' },
        { id: 'development', title: 'Desarrollo', color: 'bg-slate-500/10 border-slate-500/20' },
        { id: 'review', title: 'Revisión', color: 'bg-slate-500/10 border-slate-500/20' },
        { id: 'completed', title: 'Finalizado', color: 'bg-slate-500/10 border-slate-500/20' },
    ];

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (!user) return;

            const [projectsData, clientsData] = await Promise.all([
                getProjects(user.uid),
                getClients(user.uid)
            ]);

            setProjects(projectsData);

            const clientMap: Record<string, string> = {};
            clientsData.forEach(c => clientMap[c.id] = c.name);
            setClients(clientMap);

        } catch (error) {
            console.error("Error loading projects/clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (projectId: string) => {
        if (!confirm('¿Estás seguro de eliminar este proyecto?')) return;
        try {
            await deleteProject(projectId);
            loadData();
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

    const [initialStatus, setInitialStatus] = useState<ProjectStatus>('incoming');

    const handleAddNew = (status: ProjectStatus) => {
        setEditingProject(undefined);
        setInitialStatus(status);
        setDialogOpen(true);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const projectId = active.id as string;
            const newStatus = over.id as ProjectStatus;

            // Optimistic update
            setProjects(projects.map(p =>
                p.id === projectId ? { ...p, status: newStatus } : p
            ));

            try {
                await updateProject(projectId, { status: newStatus });
            } catch (error) {
                console.error("Error updating project status:", error);
                // Revert on error - reloading data is easiest
                loadData();
            }
        }
        setActiveId(null);
    };

    const activeProject = activeId ? projects.find(p => p.id === activeId) : null;
    const filteredProjects = projects.filter(project =>
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clients[project.clientId] || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
                    <p className="text-muted-foreground">Gestiona tus proyectos y flujo de trabajo</p>
                </div>
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
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 items-start overflow-x-auto pb-4 touch-none cursor-grab active:cursor-grabbing min-h-[calc(100vh-12rem)]"
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {columns.map((column) => (
                        <KanbanColumn
                            key={column.id}
                            id={column.id}
                            title={column.title}
                            color={column.color}
                            projects={filteredProjects.filter(p => p.status === column.id)}
                            clients={clients}
                            loading={loading}
                            onEdit={(project) => {
                                setEditingProject(project);
                                setDialogOpen(true);
                            }}
                            onDelete={handleDelete}
                            onAdd={() => handleAddNew(column.id)}
                        />
                    ))}
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

            <ProjectDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                project={editingProject}
                onSuccess={loadData}
                entityId={entityId}
                initialStatus={initialStatus}
            />
        </div >
    );
}
