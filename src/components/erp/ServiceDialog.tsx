import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSubscription, updateSubscription } from '@/lib/firebase/database';
import type { Client, Subscription } from '@/types';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ServiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription?: Subscription & { clientId?: string }; // Enhanced type
    clients: Client[];
    onSuccess: () => void;
}

import { useAuth } from '@/contexts/AuthContext';

export function ServiceDialog({ open, onOpenChange, subscription, clients, onSuccess }: ServiceDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [clientId, setClientId] = useState('');
    const [formData, setFormData] = useState<Partial<Subscription>>({
        name: '',
        amount: 0,
        frequency: 'monthly',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'active'
    });

    useEffect(() => {
        if (subscription) {
            setClientId(subscription.clientId || ''); // We need clientId passed in editing
            setFormData({
                name: subscription.name,
                amount: subscription.amount,
                frequency: subscription.frequency,
                startDate: subscription.startDate,
                status: subscription.status,
                nextBillingDate: subscription.nextBillingDate // Keep existing schedule
            });
        } else {
            setClientId('');
            setFormData({
                name: '',
                amount: 0,
                frequency: 'monthly',
                startDate: format(new Date(), 'yyyy-MM-dd'),
                status: 'active'
            });
        }
    }, [subscription, open]);

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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{subscription ? 'Editar Servicio' : 'Asignar Nuevo Servicio'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Client Selection (Disabled if editing usually, but allowed here) */}
                    <div className="grid gap-2">
                        <Label htmlFor="client">Cliente</Label>
                        <Select
                            value={clientId}
                            onValueChange={setClientId}
                            disabled={!!subscription} // Prevent moving service between clients for simplicity
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

                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre del Servicio / Plan</Label>
                        <Input
                            id="name"
                            placeholder="Ej. Mantenimiento Web"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
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
