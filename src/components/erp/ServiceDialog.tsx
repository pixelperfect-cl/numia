import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSubscription, updateSubscription, getServiceDefinitions } from '@/lib/firebase/database';
import type { Client, Subscription, ServiceDefinition } from '@/types';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface ServiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription?: Subscription & { clientId?: string }; // Enhanced type
    clients: Client[];
    onSuccess: () => void;
}

export function ServiceDialog({ open, onOpenChange, subscription, clients, onSuccess }: ServiceDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [definitions, setDefinitions] = useState<ServiceDefinition[]>([]);

    // Form State
    const [clientId, setClientId] = useState('');
    const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>('custom');

    const [formData, setFormData] = useState<Partial<Subscription>>({
        name: '',
        amount: 0,
        currency: 'CLP',
        frequency: 'monthly',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'active'
    });

    // Load Service Definitions
    useEffect(() => {
        if (user && open) {
            getServiceDefinitions(user.uid).then(setDefinitions);
        }
    }, [user, open]);

    useEffect(() => {
        if (subscription) {
            setClientId(subscription.clientId || ''); // We need clientId passed in editing
            setFormData({
                name: subscription.name,
                amount: subscription.amount,
                currency: subscription.currency || 'CLP',
                frequency: subscription.frequency,
                startDate: subscription.startDate,
                status: subscription.status,
                nextBillingDate: subscription.nextBillingDate // Keep existing schedule
            });
            setSelectedDefinitionId('custom');
        } else {
            setClientId('');
            setSelectedDefinitionId('custom');
            setFormData({
                name: '',
                amount: 0,
                currency: 'CLP',
                frequency: 'monthly',
                startDate: format(new Date(), 'yyyy-MM-dd'),
                status: 'active'
            });
        }
    }, [subscription, open]);

    const handleDefinitionChange = (defId: string) => {
        setSelectedDefinitionId(defId);
        if (defId === 'custom') {
            // Optional: reset or keep? Keeping current allows "starting from" a template then editing.
            return;
        }

        const def = definitions.find(d => d.id === defId);
        if (def) {
            setFormData(prev => ({
                ...prev,
                name: def.name,
                amount: def.amount,
                currency: def.currency,
                frequency: def.frequency
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId || !formData.name || !formData.amount) return;

        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                // Create logic: nextBillingDate = startDate initially
                nextBillingDate: subscription ? formData.nextBillingDate : formData.startDate
            };

            if (subscription) {
                await updateSubscription(subscription.id, dataToSave);
            } else {
                if (!user) return; // Should not happen
                await createSubscription(user.uid, clientId, dataToSave as any);
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving service:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{subscription ? 'Editar Servicio' : 'Asignar Nuevo Servicio'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Client Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="client">Cliente</Label>
                        <Select
                            value={clientId}
                            onValueChange={setClientId}
                            disabled={!!subscription}
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

                    {/* Catalog Selection (Only for new) */}
                    {!subscription && (
                        <div className="grid gap-2">
                            <Label htmlFor="catalog">Cargar desde Catálogo (Opcional)</Label>
                            <Select
                                value={selectedDefinitionId}
                                onValueChange={handleDefinitionChange}
                            >
                                <SelectTrigger className="bg-muted/30">
                                    <SelectValue placeholder="Seleccionar servicio predefinido..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">-- Personalizado --</SelectItem>
                                    {definitions.map(def => (
                                        <SelectItem key={def.id} value={def.id}>
                                            {def.name} ({def.currency === 'UF' ? 'UF' : '$'} {def.amount})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre del Servicio / Plan</Label>
                        <Input
                            id="name"
                            placeholder="Ej. Mantenimiento Web"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({ ...formData, name: e.target.value });
                                if (selectedDefinitionId !== 'custom') setSelectedDefinitionId('custom'); // Switch to custom if edited
                            }}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="currency">Moneda</Label>
                            <Select
                                value={formData.currency}
                                onValueChange={(val: 'CLP' | 'UF') => setFormData({ ...formData, currency: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CLP">CLP (Pesos)</SelectItem>
                                    <SelectItem value="UF">UF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2 col-span-2">
                            <Label htmlFor="amount">Monto</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="frequency">Frecuencia</Label>
                            <Select
                                value={formData.frequency}
                                onValueChange={(val: any) => setFormData({ ...formData, frequency: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                    <SelectItem value="yearly">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">Estado</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="inactive">Inactivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="startDate">Fecha Inicio</Label>
                        <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            required
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
