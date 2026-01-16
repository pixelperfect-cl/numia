import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectChecklist, Project } from '@/types';
import { logProjectActivity } from "@/lib/activityUtils";
import { CheckSquare, Plus, Trash, X, Flag, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { updateProject } from '@/lib/firebase/database';
import { uploadProjectAsset } from '@/lib/firebase/storage';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { cn } from "@/lib/utils";

interface ProjectOverviewProps {
    project: Project;
    onUpdate: (updatedProject: Project) => void;
}

export function ProjectOverview({ project, onUpdate }: ProjectOverviewProps) {
    const { user } = useAuth();
    const [description, setDescription] = useState(project.description || '');
    const [isSavingDesc, setIsSavingDesc] = useState(false);

    const handleUpdateChecklists = async (newChecklists: ProjectChecklist[]) => {
        if (!user) return;

        // Recalculate global progress
        let total = 0;
        let completed = 0;
        newChecklists.forEach(list => {
            total += list.items.length;
            completed += list.items.filter(i => i.completed).length;
        });
        const newProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

        const updatedProject = { ...project, checklists: newChecklists, progress: newProgress };

        // Optimistic update
        onUpdate(updatedProject);

        try {
            await updateProject(project.id, { checklists: newChecklists, progress: newProgress });

            // Log if a checklist is completed
            newChecklists.forEach(list => {
                const oldList = project.checklists?.find(l => l.id === list.id);
                const isNowComplete = list.items.length > 0 && list.items.every(i => i.completed);
                const wasComplete = oldList && oldList.items.length > 0 && oldList.items.every(i => i.completed);

                if (isNowComplete && !wasComplete) {
                    logProjectActivity(
                        project.id,
                        'milestone_completed',
                        `Hito completado: ${list.title}`,
                        user?.uid,
                        user?.displayName || user?.email?.split('@')[0]
                    );
                }
            });

        } catch (error) {
            console.error("Failed to update checklists", error);
        }
    };

    const handleSaveDescription = async (newDescription?: string) => {
        const contentToSave = newDescription !== undefined ? newDescription : description;
        if (!user || contentToSave === project.description) return;

        setIsSavingDesc(true);
        try {
            await updateProject(project.id, { description: contentToSave });
            onUpdate({ ...project, description: contentToSave });

            logProjectActivity(
                project.id,
                'description_update',
                "Descripción del proyecto actualizada",
                user?.uid,
                user?.displayName || user?.email?.split('@')[0]
            );

        } catch (error) {
            console.error("Failed to save description", error);
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        try {
            return await uploadProjectAsset(file, project.id);
        } catch (error) {
            console.error("Upload failed", error);
            throw error;
        }
    };

    const milestones = (project.checklists || []).map(list => {
        const total = list.items.length;
        const completedItems = list.items.filter(i => i.completed).length;
        let status: 'pending' | 'active' | 'completed' = 'pending';
        if (total > 0) {
            if (completedItems === total) status = 'completed';
            else if (completedItems > 0) status = 'active';
        }
        return { id: list.id, title: list.title, status };
    });

    return (
        <div className="space-y-8">
            {/* Description Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold tracking-tight">Descripción del Proyecto</h3>
                <Card className="border-none shadow-none bg-muted/20">
                    <CardContent className="p-0">
                        <RichTextEditor
                            content={description}
                            onChange={(html) => {
                                setDescription(html);
                            }}
                            onImageUpload={handleImageUpload}
                            placeholder="Añade una descripción detallada del proyecto..."
                        />
                        {description !== project.description && (
                            <div className="flex justify-end p-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleSaveDescription()}
                                    disabled={isSavingDesc}
                                >
                                    {isSavingDesc ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Checklists & Milestones Section */}
            < div className="space-y-6" >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight">Hitos y Tareas</h3>
                        <p className="text-sm text-muted-foreground">Cada lista de tareas representa un hito en el proyecto.</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            const newChecklist: ProjectChecklist = {
                                id: crypto.randomUUID(),
                                title: 'Nuevo Hito',
                                items: []
                            };
                            handleUpdateChecklists([...(project.checklists || []), newChecklist]);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Hito
                    </Button>
                </div>

                {/* Integrated Roadmap Visualization */}
                {
                    milestones.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-2 px-1">
                            {milestones.map((m, i) => (
                                <div key={m.id} className="flex items-center shrink-0">
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                        m.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" :
                                            m.status === 'active' ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" :
                                                "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700"
                                    )}>
                                        {m.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : m.status === 'active' ? <Clock className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                                        {m.title}
                                    </div>
                                    {i < milestones.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                                </div>
                            ))}
                        </div>
                    )
                }

                {
                    (project.checklists || []).length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Flag className="h-8 w-8 opacity-50" />
                                <p>No hay hitos definidos.</p>
                                <Button variant="link" onClick={() => {
                                    const newChecklist: ProjectChecklist = {
                                        id: crypto.randomUUID(),
                                        title: 'Hito 1: Planificación',
                                        items: []
                                    };
                                    handleUpdateChecklists([newChecklist]);
                                }}>
                                    Crear primer hito
                                </Button>
                            </div>
                        </div>
                    )
                }

                <div className="grid gap-6">
                    {(project.checklists || []).map((checklist, cIndex) => {
                        const totalItems = checklist.items.length;
                        const completedItems = checklist.items.filter(i => i.completed).length;
                        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                        return (
                            <Card key={checklist.id} className="overflow-hidden border shadow-sm">
                                <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center border",
                                        progress === 100 ? "bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" : "bg-background border-muted"
                                    )}>
                                        {progress === 100 ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-mono">{cIndex + 1}</span>}
                                    </div>

                                    <Input
                                        value={checklist.title}
                                        onChange={(e) => {
                                            const newChecklists = [...(project.checklists || [])];
                                            newChecklists[cIndex].title = e.target.value;
                                            handleUpdateChecklists(newChecklists);
                                        }}
                                        className="h-8 font-semibold bg-transparent border-transparent hover:border-input focus:border-input flex-1 px-1 text-base shadow-none"
                                    />

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Se eliminará el hito "{checklist.title}" y todas sus tareas.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive hover:bg-destructive/90"
                                                    onClick={() => {
                                                        const newChecklists = [...(project.checklists || [])];
                                                        newChecklists.splice(cIndex, 1);
                                                        handleUpdateChecklists(newChecklists);
                                                    }}
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>

                                <CardContent className="p-0">
                                    <div className="px-4 pt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-muted-foreground">Progreso</span>
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
                                        </div>
                                        <Progress
                                            value={progress}
                                            className="h-2 bg-secondary"
                                            indicatorClassName="bg-blue-600 dark:bg-blue-500"
                                        />
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {checklist.items.map((item, iIndex) => (
                                            <div key={item.id} className="flex items-center gap-3 group/item">
                                                <Checkbox
                                                    checked={item.completed}
                                                    onCheckedChange={(checked) => {
                                                        const newChecklists = [...(project.checklists || [])];
                                                        newChecklists[cIndex].items[iIndex].completed = !!checked;
                                                        handleUpdateChecklists(newChecklists);

                                                        if (user) {
                                                            logProjectActivity(
                                                                project.id,
                                                                'task_completed', // converting to boolean/string msg
                                                                !!checked
                                                                    ? `Tarea completada: ${item.text}`
                                                                    : `Tarea desmarcada: ${item.text}`,
                                                                user.uid,
                                                                user.displayName || 'Usuario'
                                                            );
                                                        }
                                                    }}
                                                />
                                                <Input
                                                    value={item.text}
                                                    onChange={(e) => {
                                                        const newChecklists = [...(project.checklists || [])];
                                                        newChecklists[cIndex].items[iIndex].text = e.target.value;
                                                        handleUpdateChecklists(newChecklists);
                                                    }}
                                                    className={cn(
                                                        "h-8 text-sm bg-transparent border-transparent hover:border-input focus:border-input flex-1 shadow-none",
                                                        item.completed && "text-muted-foreground line-through"
                                                    )}
                                                    placeholder="Nombre de la tarea..."
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                    onClick={() => {
                                                        const newChecklists = [...(project.checklists || [])];
                                                        newChecklists[cIndex].items.splice(iIndex, 1);
                                                        handleUpdateChecklists(newChecklists);
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-muted-foreground hover:text-primary w-full justify-start mt-2"
                                            onClick={() => {
                                                const newChecklists = [...(project.checklists || [])];
                                                newChecklists[cIndex].items.push({
                                                    id: crypto.randomUUID(),
                                                    text: '',
                                                    completed: false
                                                });
                                                handleUpdateChecklists(newChecklists);
                                            }}
                                        >
                                            <Plus className="mr-2 h-3 w-3" /> Añadir tarea
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div >
        </div >
    );
}
