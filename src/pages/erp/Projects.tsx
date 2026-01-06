import { useState, useEffect } from 'react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects, getClients, deleteProject } from '@/lib/firebase/database';
import type { Project, Client, ProjectStatus } from '@/types';
import { ProjectCard } from '@/components/erp/ProjectCard';
import { ProjectDialog } from '@/components/erp/ProjectDialog';

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

    // Drag to scroll state
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
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
        { id: 'design', title: 'Diseño', color: 'bg-blue-500/10 border-blue-500/20' },
        { id: 'development', title: 'Desarrollo', color: 'bg-amber-500/10 border-amber-500/20' },
        { id: 'review', title: 'Revisión', color: 'bg-purple-500/10 border-purple-500/20' },
        { id: 'completed', title: 'Finalizado', color: 'bg-green-500/10 border-green-500/20' },
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

    const handleEdit = (project: Project) => {
        setEditingProject(project);
        setDialogOpen(true);
    };

    // Filter by entityId if provided
    const scopedProjects = entityId
        ? projects.filter(p => p.entityId === entityId)
        : projects;

    const filteredProjects = scopedProjects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Proyectos</h1>
                    <p className="text-muted-foreground">Tablero Kanban para seguimiento de estados</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar proyecto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Button onClick={() => { setEditingProject(undefined); setDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Proyecto
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            <div
                className="flex-1 overflow-x-auto overflow-y-hidden pb-2 select-none cursor-grab active:cursor-grabbing no-scrollbar"
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                <div className="flex h-full gap-4 min-w-[1200px]">
                    {columns.map((column) => (
                        <div key={column.id} className={`flex-1 flex flex-col min-w-[280px] rounded-lg border ${column.color}`}>
                            {/* Column Header */}
                            <div className="p-3 border-b border-inherit bg-background/50 backdrop-blur rounded-t-lg sticky top-0 z-10 font-semibold flex justify-between items-center">
                                <span>{column.title}</span>
                                <span className="text-xs bg-background/80 px-2 py-0.5 rounded-full border">
                                    {filteredProjects.filter(p => p.status === column.id).length}
                                </span>
                            </div>

                            {/* Column Content */}
                            <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
                                {loading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                ) : (
                                    filteredProjects
                                        .filter(p => p.status === column.id)
                                        .map(project => (
                                            <div onMouseDown={(e) => e.stopPropagation()} key={project.id}>
                                                <ProjectCard
                                                    project={project}
                                                    clientName={clients[project.clientId] || 'Cliente desconocido'}
                                                    onEdit={handleEdit}
                                                    onDelete={handleDelete}
                                                />
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ProjectDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                project={editingProject}
                onSuccess={loadData}
                entityId={entityId}
            />
        </div>
    );
}
