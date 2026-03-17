import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { createClient, updateClient } from '@/lib/supabase/database';
import type { Client } from '@/types';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface ClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client?: Client;
    onSuccess: (client?: Client) => void;
    entityId?: string;
}

export function ClientDialog({ open, onOpenChange, client, onSuccess, entityId }: ClientDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Client>>({
        name: '',
        representative: '',
        website: '',
        email: '',
        phone: '',
        emails: [],
        phones: [],
        rut: '',
        status: 'active',
        entityId: entityId || '',
    });

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name,
                representative: client.representative || '',
                email: client.email || '',
                phone: client.phone || '',
                emails: client.emails || [],
                phones: client.phones || [],
                rut: client.rut || '',
                status: client.status,
                entityId: client.entityId,
            });
        } else {
            setFormData({
                name: '',
                representative: '',
                email: '',
                phone: '',
                emails: [],
                phones: [],
                rut: '',
                status: 'active',
                entityId: entityId || '',
            });
        }
    }, [client, open, entityId]);

    const addEmail = () => {
        setFormData({
            ...formData,
            emails: [...(formData.emails || []), '']
        });
    };

    const removeEmail = (index: number) => {
        const newEmails = [...(formData.emails || [])];
        newEmails.splice(index, 1);
        setFormData({ ...formData, emails: newEmails });
    };

    const updateEmail = (index: number, value: string) => {
        const newEmails = [...(formData.emails || [])];
        newEmails[index] = value;
        setFormData({ ...formData, emails: newEmails });
    };

    const addPhone = () => {
        setFormData({
            ...formData,
            phones: [...(formData.phones || []), '']
        });
    };

    const removePhone = (index: number) => {
        const newPhones = [...(formData.phones || [])];
        newPhones.splice(index, 1);
        setFormData({ ...formData, phones: newPhones });
    };

    const updatePhone = (index: number, value: string) => {
        const newPhones = [...(formData.phones || [])];
        newPhones[index] = value;
        setFormData({ ...formData, phones: newPhones });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.name) return;

        if (!formData.entityId && entityId) {
            // Ensure entityId is set if context provides it
            formData.entityId = entityId;
        }

        setLoading(true);
        try {
            let clientId = client?.id;

            if (clientId) {
                // Update existing
                await updateClient(clientId, formData);
            } else {
                // Create new
                clientId = await createClient(user.uid, formData as any);
            }

            const savedClient: Client = {
                id: clientId || '',
                ...formData,
                createdAt: client?.createdAt || new Date().toISOString(),
                status: formData.status || 'active',
                entityId: formData.entityId || '',
            } as Client;

            onSuccess(savedClient);
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error saving client:", error);
            alert(`Error al guardar cliente: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{client ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                    <DialogDescription>
                        {client ? 'Modifica los datos del cliente.' : 'Ingresa los datos para registrar un nuevo cliente.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre / Empresa</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="representative">Representante</Label>
                            <Input
                                id="representative"
                                placeholder="Ej: Juan Pérez"
                                value={formData.representative}
                                onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="website">Sitio Web</Label>
                            <Input
                                id="website"
                                placeholder="Ej: www.empresa.com"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="rut">RUT de Facturación</Label>
                            <Input
                                id="rut"
                                placeholder="12.345.678-9"
                                value={formData.rut}
                                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                            />
                        </div>

                        {/* Additional Emails */}
                        {(formData.emails && formData.emails.length > 0) && (
                            <div className="grid gap-2">
                                <Label>Emails Adicionales</Label>
                                {formData.emails.map((email, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            type="email"
                                            placeholder="email@ejemplo.com"
                                            value={email}
                                            onChange={(e) => updateEmail(index, e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeEmail(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addEmail}
                            className="w-full"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Agregar Email
                        </Button>

                        {/* Additional Phones */}
                        {(formData.phones && formData.phones.length > 0) && (
                            <div className="grid gap-2">
                                <Label>Teléfonos Adicionales</Label>
                                {formData.phones.map((phone, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            placeholder="+56 9 1234 5678"
                                            value={phone}
                                            onChange={(e) => updatePhone(index, e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removePhone(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addPhone}
                            className="w-full"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Agregar Teléfono
                        </Button>

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

