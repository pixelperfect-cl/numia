import { Project } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Trash2 } from 'lucide-react';

interface ProjectSettingsTabProps {
    project: Project;
    onUpdate?: (updatedProject: Project) => void;
}

export function ProjectSettingsTab({ project, onUpdate }: ProjectSettingsTabProps) {
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
                    <Button variant="outline" className="gap-2">
                        <Archive className="h-4 w-4" />
                        Archivar Proyecto
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
                    <Button variant="destructive" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Eliminar Proyecto
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
