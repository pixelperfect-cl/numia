import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSubscription, updateSubscription, getServiceDefinitions, getClients } from '@/lib/firebase/database';
import type { Client, Subscription, ServiceDefinition } from '@/types';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { ClientDialog } from './ClientDialog';

interface ServiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription?: Subscription & { clientId?: string }; // Enhanced type
    clients?: Client[];
    onSuccess: () => void;
    defaultClientId?: string;
    preselectedDefinition?: ServiceDefinition | null;
    onRefreshClients?: () => void;
    entityId?: string;
    defaultFrequency?: 'monthly' | 'yearly';
    defaultMonthIndex?: number; // 0 = monthly/general, 1-12 = Jan-Dec
}

// Helper to calculate default date from month index
function getDefaultDateFromMonth(monthIndex?: number): string {
    if (!monthIndex || monthIndex === 0) {
        // Monthly (General) column or no context - use today
        return format(new Date(), 'yyyy-MM-dd');
    }
    // Yearly column - use 1st of that month in current year
    const year = new Date().getFullYear();
    const month = monthIndex - 1; // Convert 1-12 to 0-11
    return format(new Date(year, month, 1), 'yyyy-MM-dd');
}

export function ServiceDialog({
    open,
    onOpenChange,
    subscription,
    clients: propClients,
    onSuccess,
    defaultClientId,
    preselectedDefinition,
    onRefreshClients,
    entityId,
    defaultFrequency,
    defaultMonthIndex
}: ServiceDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [definitions, setDefinitions] = useState<ServiceDefinition[]>([]);
    const [internalClients, setInternalClients] = useState<Client[]>([]);

    // Use passed clients or internal clients
    const clients = propClients || internalClients;

    // Fetch clients if not provided
    useEffect(() => {
        if (open && user && !propClients) {
            getClients(user.uid).then(setInternalClients);
        }
    }, [open, user, propClients]);

    // Form State
    const [clientId, setClientId] = useState('');
    const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>('custom');
    const [clientDialogOpen, setClientDialogOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<Subscription>>({
        name: '',
        amount: 0,
        currency: 'CLP',
        frequency: 'monthly',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'active',
        notes: ''
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

                nextBillingDate: subscription.nextBillingDate, // Keep existing schedule
                notes: subscription.notes || ''
            });
            setSelectedDefinitionId('custom');
        } else if (preselectedDefinition) {
            // Pre-fill from selection
            setClientId(defaultClientId || '');
            setSelectedDefinitionId(preselectedDefinition.id);
            const defaultDate = getDefaultDateFromMonth(defaultMonthIndex);
            setFormData({
                name: preselectedDefinition.name,
                amount: preselectedDefinition.amount,
                currency: preselectedDefinition.currency,
                frequency: preselectedDefinition.frequency,
                startDate: defaultDate,
                status: 'active'
            });
        } else {
            setClientId(defaultClientId || '');
            setSelectedDefinitionId('custom');
            const defaultDate = getDefaultDateFromMonth(defaultMonthIndex);
            setFormData({
                name: '',
                amount: 0,
                currency: 'CLP',
                frequency: defaultFrequency || 'monthly',
                startDate: defaultDate,
                status: 'active',
                notes: ''
            });
        }
    }, [subscription, open, defaultClientId, preselectedDefinition, defaultFrequency, defaultMonthIndex]);

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

    const handleClientSuccess = (newClient?: Client) => {
        if (newClient) {
            if (onRefreshClients) {
                onRefreshClients();
            }
            // Temporarily add to local list if not yet refreshed by parent
            if (!clients.find(c => c.id === newClient.id)) {
                clients.push(newClient);
            }
            setClientId(newClient.id);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{subscription ? 'Editar Servicio' : 'Asignar Nuevo Servicio'}</DialogTitle>
                    <DialogDescription>
                        {subscription ? 'Modifica los detalles del servicio existente.' : 'Completa el formulario para asignar un nuevo servicio a un cliente.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Client Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="client">Cliente</Label>
                        {/* Show client info card when preselected (from 3-step flow) */}
                        {defaultClientId && !subscription ? (
                            <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-sm font-semibold text-primary">
                                        {clients.find(c => c.id === clientId)?.name?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                        {clients.find(c => c.id === clientId)?.name || 'Cliente seleccionado'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {clients.find(c => c.id === clientId)?.email || 'Sin email'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Select
                                value={clientId}
                                onValueChange={(val) => {
                                    if (val === 'new') {
                                        setClientDialogOpen(true);
                                    } else {
                                        setClientId(val);
                                    }
                                }}
                                disabled={!!subscription}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new" className="text-blue-500 hover:text-blue-700 font-medium border-b mb-1">
                                        + Crear Nuevo Cliente
                                    </SelectItem>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
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

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                            id="notes"
                            placeholder="Información adicional del servicio..."
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="resize-none"
                            rows={3}
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

            <ClientDialog
                open={clientDialogOpen}
                onOpenChange={setClientDialogOpen}
                onSuccess={handleClientSuccess}
                entityId={entityId}
            />
        </Dialog>
    );
}
