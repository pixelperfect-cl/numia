import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ClientSelectionStep } from './ClientSelectionStep';
import { ProjectDialog } from './ProjectDialog'; // We will reuse the form part of ProjectDialog or refactor it
import type { Client, Project } from '@/types';
import { useNavigate } from 'react-router-dom';
import { createProject, getEntity, getEntities } from '@/lib/firebase/database';
import { useAuth } from '@/contexts/AuthContext';
import { syncClient, syncEntity } from '@/lib/supabase/adapter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ProjectCreationWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ProjectCreationWizard({ open, onOpenChange, onSuccess }: ProjectCreationWizardProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(false);

    // Form Data for Step 2
    const [formData, setFormData] = useState({
        name: '',
        amount: 0,
        currency: 'CLP',
        status: 'incoming',
        dueDate: '',
        description: ''
    });

    const handleClientSelect = (client: Client) => {
        setSelectedClient(client);
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
        setSelectedClient(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedClient || !formData.name) return;

        setLoading(true);
        try {
            // Logic copied/adapted from ProjectDialog to sync entities
            let clientEntityId = selectedClient.entityId;

            // Sync logic would theoretically go here if we need to robustly ensure entity exists
            // For now, assuming standard flow

            const projectData = {
                ...formData,
                clientId: selectedClient.id,
                entityId: clientEntityId || '', // Should ideally handle entity resolution strictly
                checklists: [],
                progress: 0
            };

            // Basic Entity Sync if missing (simplified from ProjectDialog)
            if (!clientEntityId) {
                const entities = await getEntities(user.uid);
                if (entities.length > 0) {
                    projectData.entityId = entities[0].id;
                }
            }

            const newProject = await createProject(user.uid, projectData as any);

            toast.success('Proyecto creado exitosamente');
            onSuccess();
            onOpenChange(false);

            // Navigate to the new project details page
            if (newProject) {
                navigate(`/erp/projects/${newProject}`);
            }

            // Reset state
            setStep(1);
            setSelectedClient(null);
            setFormData({
                name: '',
                amount: 0,
                currency: 'CLP',
                status: 'incoming',
                dueDate: '',
                description: ''
            });

        } catch (error) {
            console.error("Error creating project:", error);
            toast.error("Error al crear el proyecto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {step === 1 ? 'Seleccionar Cliente' : 'Nuevo Proyecto'}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? 'Elige un cliente para asignar el proyecto.'
                            : `Creando proyecto para ${selectedClient?.name}`
                        }
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <ClientSelectionStep
                        onSelect={handleClientSelect}
                        onCancel={() => onOpenChange(false)}
                    />
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre Proyecto</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Implementación ERP"
                                required
                                autoFocus
                            />
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
                                    value={formData.currency}
                                    onValueChange={(val) => setFormData({ ...formData, currency: val })}
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
                            <Label htmlFor="description">Descripción</Label>
                            <textarea
                                id="description"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.description}
                                onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Detalles iniciales del proyecto..."
                            />
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button type="button" variant="outline" onClick={handleBack}>
                                Volver
                            </Button>
                            <Button type="submit" disabled={loading || !formData.name}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Proyecto
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
