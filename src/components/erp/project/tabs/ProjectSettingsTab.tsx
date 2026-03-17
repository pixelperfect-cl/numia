import { Project } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Trash2 } from 'lucide-react';
import { updateProject, deleteProject } from '@/lib/supabase/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ProjectSettingsTabProps {
    project: Project;
    onUpdate?: (updatedProject: Project) => void;
}

export function ProjectSettingsTab({ project, onUpdate }: ProjectSettingsTabProps) {
    const navigate = useNavigate();

    const handleArchive = async () => {
        const isArchived = !!project.archiveDate;
        const message = isArchived
            ? '¿Restaurar este proyecto? Volverá al tablero activo.'
            : '¿Archivar este proyecto? Dejará de aparecer en el tablero activo.';

        if (!confirm(message)) return;

        try {
            await updateProject(project.id, {
                archiveDate: isArchived ? null as any : new Date().toISOString()
            });
            toast.success(isArchived ? 'Proyecto restaurado' : 'Proyecto archivado');
            if (onUpdate) {
                onUpdate({ ...project, archiveDate: isArchived ? undefined : new Date().toISOString(), archived: !isArchived });
            }
        } catch (error) {
            console.error("Error archiving project:", error);
            toast.error('Error al archivar el proyecto');
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este proyecto permanentemente? Esta acción no se puede deshacer.')) return;

        try {
            await deleteProject(project.id);
            toast.success('Proyecto eliminado');
            navigate('/erp/projects');
        } catch (error) {
            console.error("Error deleting project:", error);
            toast.error('Error al eliminar el proyecto');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold tracking-tight">Configuración del Proyecto</h3>
                <p className="text-sm text-muted-foreground">
                    Opciones avanzadas y zonas de peligro.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Archivar Proyecto</CardTitle>
                    <CardDescription>
                        Archivar el proyecto lo ocultará de la vista principal pero mantendrá todos los datos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="gap-2" onClick={handleArchive}>
                        <Archive className="h-4 w-4" />
                        {project.archiveDate ? 'Restaurar Proyecto' : 'Archivar Proyecto'}
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-base text-destructive">Zona de Peligro</CardTitle>
                    <CardDescription className="text-destructive/80">
                        Estas acciones son irreversibles. Ten cuidado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" className="gap-2" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                        Eliminar Proyecto
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
