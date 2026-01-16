import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Loader2, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableProjectCard } from './SortableProjectCard';
import type { Project, ProjectStatus } from '@/types';

interface KanbanColumnProps {
    id: ProjectStatus;
    title: string;
    color: string;
    projects: Project[];
    clients: Record<string, string>;
    loading: boolean;
    onEdit: (project: Project) => void;
    onDelete: (projectId: string) => void;
    onAdd: (status: ProjectStatus) => void;
    onEditList?: (listId: string) => void;
    onDeleteList?: (listId: string) => void;
}

export function KanbanColumn({
    id,
    title,
    color,
    projects,
    clients,
    loading,
    onEdit,
    onDelete,
    onAdd,
    onEditList,
    onDeleteList
}: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div className={`flex-1 flex flex-col min-w-[280px] rounded-lg border ${color}`}>
            {/* Column Header */}
            <div className="p-3 border-b border-inherit bg-background/50 backdrop-blur rounded-t-lg sticky top-0 z-10 font-semibold flex justify-between items-center group">
                <div className="flex items-center gap-2">
                    <span>{title}</span>
                    <span className="text-xs bg-background/80 px-2 py-0.5 rounded-full border">
                        {projects.length}
                    </span>
                </div>
                {onEditList && onDeleteList && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditList(id)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar Flujo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteList(id)} className="text-red-500 focus:text-red-500">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Flujo
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Column Content */}
            <div
                ref={setNodeRef}
                className="flex-1 p-2 overflow-y-auto overflow-x-hidden custom-scrollbar max-h-[calc(100vh-220px)] min-h-[100px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <SortableContext
                        items={projects.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2 min-h-[50px]">
                            {projects.map(project => (
                                <SortableProjectCard
                                    key={project.id}
                                    project={project}
                                    clientName={clients[project.clientId] || 'Cliente desconocido'}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    </SortableContext>
                )}
            </div>

            {/* Column Footer - Add Button */}
            <div className="p-2 border-t border-inherit bg-background/50 backdrop-blur rounded-b-lg">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-background/50 h-9 font-normal"
                    onClick={() => onAdd(id)}
                >
                    <Plus className="mr-2 h-4 w-4" /> Añadir Proyecto
                </Button>
            </div>
        </div>
    );
}
