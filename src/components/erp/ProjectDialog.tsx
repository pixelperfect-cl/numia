import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Removed missing imports
import { useAuth } from '@/contexts/AuthContext';
import { createProject, updateProject, getClients } from '@/lib/firebase/database';
import type { Project, Client, ProjectStatus } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project?: Project;
    onSuccess: () => void;
    entityId?: string;
}

export function ProjectDialog({ open, onOpenChange, project, onSuccess, entityId }: ProjectDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [formData, setFormData] = useState<Partial<Project>>({
        name: '',
        clientId: '',
        entityId: entityId || '',
        status: 'incoming',
        description: '',
        dueDate: '',
        progress: 0
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
                progress: project.progress || 0
            });
        } else {
            setFormData({
                name: '',
                clientId: '',
                entityId: entityId || '',
                status: 'incoming',
                description: '',
                dueDate: '',
                progress: 0
            });
        }
    }, [project, open, entityId]);

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
            <DialogContent className="sm:max-w-[500px]">
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
                        <input
                            type="range"
                            className="w-full"
                            min="0"
                            max="100"
                            value={formData.progress}
                            onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                        />
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
