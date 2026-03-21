import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { createProject, updateProject, getClients, getEntities, getEntity } from '@/lib/supabase/database';
import type { Project, Client, ProjectStatus, ProjectChecklist, ChecklistItem, ProjectList, Entity } from '@/types';
import { Loader2, Plus, Trash, X, CheckSquare, Upload, ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Progress } from '@/components/ui/progress';
import { syncClient, syncEntity } from '@/lib/supabase/adapter';
import { toast } from 'sonner';
import { uploadProjectLogo } from '@/lib/supabase/storage';

interface ProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project?: Project;
    onSuccess: () => void;
    entityId?: string;
    initialStatus?: ProjectStatus;
    lists?: ProjectList[];
}

export function ProjectDialog({ open, onOpenChange, project, onSuccess, entityId, initialStatus = 'incoming', lists = [] }: ProjectDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<Partial<Project>>({
        name: '',
        clientId: '',
        entityId: entityId || '',
        status: initialStatus,
        description: '',
        dueDate: '',
        progress: 0,
        checklists: [],
        amount: 0,
        currency: 'CLP',
        logoUrl: ''
    });

    useEffect(() => {
        if (user) {
            loadClients();
            loadEntities();
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
                checklists: project.checklists || [],
                amount: project.amount || 0,
                currency: project.currency || 'CLP',
                logoUrl: project.logoUrl || ''
            });
            setLogoPreview(project.logoUrl || null);
        } else {
            setFormData({
                name: '',
                clientId: '',
                entityId: entityId || '',
                status: initialStatus,
                description: '',
                dueDate: '',
                progress: 0,
                checklists: [],
                amount: 0,
                currency: 'CLP',
                logoUrl: ''
            });
            setLogoPreview(null);
        }
    }, [project, open, entityId, initialStatus]);

    const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        // Upload to storage
        const uploadId = project?.id || crypto.randomUUID();
        setLogoUploading(true);
        try {
            const url = await uploadProjectLogo(file, uploadId);
            setFormData(prev => ({ ...prev, logoUrl: url }));
            toast.success('Logo subido');
        } catch (err) {
            console.error('Logo upload error:', err);
            toast.error('Error al subir el logo');
            setLogoPreview(project?.logoUrl || null);
        } finally {
            setLogoUploading(false);
        }
    };

    const handleLogoRemove = () => {
        setLogoPreview(null);
        setFormData(prev => ({ ...prev, logoUrl: '' }));
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    const loadClients = async () => {
        if (!user) return;
        try {
            const data = await getClients(user.uid);
            setClients(data);
        } catch (error) {
            console.error("Error loading clients:", error);
        }
    };

    const loadEntities = async () => {
        if (!user) return;
        try {
            const data = await getEntities(user.uid);
            setEntities(data);
        } catch (error) {
            console.error("Error loading entities:", error);
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
                // Ensure client exists in Supabase before creating project to avoid FK error
                const selectedClient = clients.find(c => c.id === formData.clientId);
                if (selectedClient && user) {
                    // Try to find entity in loaded list or fetch directly as fallback
                    let clientEntity = entities.find(e => e.id === selectedClient.entityId);

                    if (!clientEntity && selectedClient.entityId) {
                        try {
                            const fetchedEntity = await getEntity(selectedClient.entityId);
                            if (fetchedEntity) {
                                clientEntity = fetchedEntity;
                            }
                        } catch (err) {
                            console.warn("Failed to fallback fetch entity", err);
                        }
                    }

                    if (clientEntity) {
                        console.log("Syncing related Entity:", clientEntity.id);
                        await syncEntity(user.uid, clientEntity.id, clientEntity);
                    } else {
                        console.warn("Could not find related Entity for Client:", selectedClient.entityId);
                        // Fallback: Use the first available entity if specific one fails
                        if (entities.length > 0) {
                            console.log("âš ï¸ Defaulting to first available entity:", entities[0].name);
                            clientEntity = entities[0];
                            // Patch the client object for this sync operation
                            // (We cast to any to avoid strict readonly issues if present, though Client interface usually mutable here)
                            (selectedClient as any).entityId = clientEntity.id;
                            await syncEntity(user.uid, clientEntity.id, clientEntity);
                        } else {
                            console.error("âŒ No entities available to assign to client!");
                        }
                    }

                    console.log("Syncing Client:", selectedClient.id, "Entity:", selectedClient.entityId);
                    await syncClient(user.uid, selectedClient.id, selectedClient);
                }

                await createProject(user.uid, formData as any);
            }
            onSuccess();
            onOpenChange(false);
            toast.success(project ? 'Proyecto actualizado' : 'Proyecto creado exitosamente');
        } catch (error) {
            console.error("Error saving project:", error);
            toast.error("Error al guardar el proyecto");
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
                    {/* Logo Upload */}
                    <div className="flex items-center gap-4">
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoSelect}
                        />
                        <div
                            className="relative h-16 w-16 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-center overflow-hidden group shrink-0"
                            onClick={() => logoInputRef.current?.click()}
                        >
                            {logoUploading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : logoPreview ? (
                                <>
                                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Upload className="h-4 w-4 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                    <ImageIcon className="h-5 w-5" />
                                    <span className="text-[9px]">Logo</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 grid gap-2">
                            <Label htmlFor="name">Nombre Proyecto</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    {logoPreview && (
                        <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground -mt-2" onClick={handleLogoRemove}>
                            <X className="h-3 w-3 mr-1" /> Quitar logo
                        </Button>
                    )}

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
                            <Label htmlFor="amount">Monto</Label>
                            <Input
                                id="amount"
                                type="number"
                                min="0"
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                placeholder="0"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="currency">Moneda</Label>
                            <Select
                                value={formData.currency || 'CLP'}
                                onValueChange={(val: 'CLP' | 'UF') => setFormData({ ...formData, currency: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CLP">CLP</SelectItem>
                                    <SelectItem value="UF">UF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
                                    {lists.length > 0 ? (
                                        lists.map(list => (
                                            <SelectItem key={list.id} value={list.id}>{list.title}</SelectItem>
                                        ))
                                    ) : (
                                        <>
                                            <SelectItem value="incoming">Incoming</SelectItem>
                                            <SelectItem value="design">Diseño</SelectItem>
                                            <SelectItem value="development">Desarrollo</SelectItem>
                                            <SelectItem value="review">Revisión</SelectItem>
                                            <SelectItem value="completed">Finalizado</SelectItem>
                                        </>
                                    )}
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

