import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/types';

interface SortableProjectCardProps {
    project: Project;
    clientName: string;
    onEdit: (project: Project) => void;
    onDelete: (projectId: string) => void;
}

export function SortableProjectCard({ project, clientName, onEdit, onDelete }: SortableProjectCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: project.id, data: { project } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <ProjectCard
                project={project}
                clientName={clientName}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
}
