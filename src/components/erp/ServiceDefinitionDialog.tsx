import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createServiceDefinition, updateServiceDefinition } from '@/lib/firebase/database';
import type { ServiceDefinition } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ServiceDefinitionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    definition?: ServiceDefinition;
    onSuccess: () => void;
}

export function ServiceDefinitionDialog({ open, onOpenChange, definition, onSuccess }: ServiceDefinitionDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<Partial<ServiceDefinition>>({
        name: '',
        description: '',
        amount: 0,
        currency: 'CLP',
        frequency: 'monthly'
    });

    useEffect(() => {
        if (definition) {
            setFormData({
                name: definition.name,
                description: definition.description || '',
                amount: definition.amount,
                currency: definition.currency,
                frequency: definition.frequency
            });
        } else {
            setFormData({
                name: '',
                description: '',
                amount: 0,
                currency: 'CLP',
                frequency: 'monthly'
            });
        }
    }, [definition, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.name || !formData.amount) return;

        setLoading(true);
        try {
            if (definition) {
                await updateServiceDefinition(definition.id, formData);
            } else {
                await createServiceDefinition(user.uid, formData as any);
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving service definition:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{definition ? 'Editar Servicio del Catálogo' : 'Crear Nuevo Servicio en Catálogo'}</DialogTitle>
                    <DialogDescription>
                        Define los detalles de este servicio estándar para reutilizarlo.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre del Servicio</Label>
                        <Input
                            id="name"
                            placeholder="Ej. Plan Básico Mensual"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Descripción (Opcional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Detalles de lo que incluye..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                            <Label htmlFor="amount">Valor</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="frequency">Frecuencia de Cobro</Label>
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

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Definición
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
