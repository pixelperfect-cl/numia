import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Removed missing imports
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { createProject, updateProject, getClients } from '@/lib/firebase/database';
import type { Project, Client, ProjectStatus, ProjectChecklist, ChecklistItem } from '@/types';
import { Loader2, Plus, Trash, X, CheckSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is available, else I'll use a custom function or random string
import { Progress } from '@/components/ui/progress';

interface ProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project?: Project;
    onSuccess: () => void;
    entityId?: string;
    initialStatus?: ProjectStatus;
}

export function ProjectDialog({ open, onOpenChange, project, onSuccess, entityId, initialStatus = 'incoming' }: ProjectDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [formData, setFormData] = useState<Partial<Project>>({
        name: '',
        clientId: '',
        entityId: entityId || '',
        status: initialStatus,
        description: '',
        dueDate: '',
        progress: 0,
        checklists: []
    });

    useEffect(() => {
        if (user) {
            loadClients();
        }
    }, [user]);

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name,
                clientId: project.clientId,
                entityId: project.entityId,
                status: project.status,
                description: project.description || '',
                dueDate: project.dueDate || '',
                progress: project.progress || 0,
                checklists: project.checklists || []
            });
        } else {
            setFormData({
                name: '',
                clientId: '',
                entityId: entityId || '',
                status: initialStatus,
                description: '',
                dueDate: '',
                progress: 0,
                checklists: []
            });
        }
    }, [project, open, entityId, initialStatus]);

    const loadClients = async () => {
        if (!user) return;
        try {
            const data = await getClients(user.uid);
            setClients(data);
        } catch (error) {
            console.error("Error loading clients:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.name || !formData.clientId) return;

        setLoading(true);
        try {
            if (project) {
                await updateProject(project.id, formData);
            } else {
                await createProject(user.uid, formData as any);
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving project:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <DialogHeader>
                    <DialogTitle>{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre Proyecto</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="client">Cliente</Label>
                        <Select
                            value={formData.clientId}
                            onValueChange={(val) => setFormData({ ...formData, clientId: val })}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="status">Estado</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: ProjectStatus) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="incoming">Incoming</SelectItem>
                                    <SelectItem value="design">Diseño</SelectItem>
                                    <SelectItem value="development">Desarrollo</SelectItem>
                                    <SelectItem value="review">Revisión</SelectItem>
                                    <SelectItem value="completed">Finalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Fecha Entrega</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Progreso ({formData.progress}%)</Label>
                        <div className="relative w-full h-2 bg-secondary rounded-full">
                            <Progress
                                value={formData.progress}
                                className="h-full"
                                indicatorClassName="bg-cyan-500 shadow-[0_0_10px_#06b6d4]"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Descripción</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.description}
                            onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detalles del proyecto..."
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Listas de verificación</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const newChecklist: ProjectChecklist = {
                                        id: crypto.randomUUID(),
                                        title: 'Nueva Lista',
                                        items: []
                                    };
                                    setFormData({ ...formData, checklists: [...(formData.checklists || []), newChecklist] });
                                }}
                            >
                                <Plus className="mr-2 h-3 w-3" /> Nueva Lista
                            </Button>
                        </div>

                        <div className="space-y-4 pr-2">
                            {(formData.checklists || []).map((checklist, cIndex) => {
                                const totalItems = checklist.items.length;
                                const completedItems = checklist.items.filter(i => i.completed).length;
                                const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                                return (
                                    <div key={checklist.id} className="border rounded-md p-3 space-y-3 bg-muted/20">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    value={checklist.title}
                                                    onChange={(e) => {
                                                        const newChecklists = [...(formData.checklists || [])];
                                                        newChecklists[cIndex].title = e.target.value;
                                                        setFormData({ ...formData, checklists: newChecklists });
                                                    }}
                                                    className="h-8 font-medium bg-transparent border-transparent hover:border-input focus:border-input flex-1"
                                                />
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {Math.round(progress)}%
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => {
                                                        const newChecklists = [...(formData.checklists || [])];
                                                        newChecklists.splice(cIndex, 1);

                                                        // Recalculate progress
                                                        let total = 0;
                                                        let completed = 0;
                                                        newChecklists.forEach(list => {
                                                            total += list.items.length;
                                                            completed += list.items.filter(i => i.completed).length;
                                                        });
                                                        const newProgress = total > 0 ? Math.round((completed / total) * 100) : formData.progress;

                                                        setFormData({ ...formData, checklists: newChecklists, progress: newProgress });
                                                    }}
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {/* Progress Bar with Numia Blue and Glow */}
                                            <div className="w-full px-1">
                                                <Progress
                                                    value={progress}
                                                    className="h-1.5"
                                                    indicatorClassName="bg-[#008bff] shadow-[0_0_8px_#008bff]"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 pl-6">
                                            {checklist.items.map((item, iIndex) => (
                                                <div key={item.id} className="flex items-center gap-2 group">
                                                    <Checkbox
                                                        checked={item.completed}
                                                        onCheckedChange={(checked) => {
                                                            const newChecklists = [...(formData.checklists || [])];
                                                            newChecklists[cIndex].items[iIndex].completed = !!checked;

                                                            // Recalculate progress
                                                            let total = 0;
                                                            let completed = 0;
                                                            newChecklists.forEach(list => {
                                                                total += list.items.length;
                                                                completed += list.items.filter(i => i.completed).length;
                                                            });
                                                            const newProgress = total > 0 ? Math.round((completed / total) * 100) : formData.progress;

                                                            setFormData({ ...formData, checklists: newChecklists, progress: newProgress });
                                                        }}
                                                    />
                                                    <Input
                                                        value={item.text}
                                                        onChange={(e) => {
                                                            const newChecklists = [...(formData.checklists || [])];
                                                            newChecklists[cIndex].items[iIndex].text = e.target.value;
                                                            setFormData({ ...formData, checklists: newChecklists });
                                                        }}
                                                        className="h-7 text-sm bg-transparent border-transparent hover:border-input focus:border-input"
                                                        placeholder="Nombre de la tarea..."
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            const newChecklists = [...(formData.checklists || [])];
                                                            newChecklists[cIndex].items.splice(iIndex, 1);

                                                            // Recalculate progress
                                                            let total = 0;
                                                            let completed = 0;
                                                            newChecklists.forEach(list => {
                                                                total += list.items.length;
                                                                completed += list.items.filter(i => i.completed).length;
                                                            });
                                                            const newProgress = total > 0 ? Math.round((completed / total) * 100) : formData.progress;

                                                            setFormData({ ...formData, checklists: newChecklists, progress: newProgress });
                                                        }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-muted-foreground hover:text-primary"
                                                onClick={() => {
                                                    const newChecklists = [...(formData.checklists || [])];
                                                    newChecklists[cIndex].items.push({
                                                        id: crypto.randomUUID(),
                                                        text: '',
                                                        completed: false
                                                    });

                                                    // Recalculate progress
                                                    let total = 0;
                                                    let completed = 0;
                                                    newChecklists.forEach(list => {
                                                        total += list.items.length;
                                                        completed += list.items.filter(i => i.completed).length;
                                                    });
                                                    const newProgress = total > 0 ? Math.round((completed / total) * 100) : formData.progress;

                                                    setFormData({ ...formData, checklists: newChecklists, progress: newProgress });
                                                }}
                                            >
                                                <Plus className="mr-1 h-3 w-3" /> Añadir elemento
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}</div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
