import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { updateEntity, updateBox } from '@/lib/supabase/database';
import type { Entity, Box } from '@/types';

interface BoxDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entity: Entity;
    editingBox?: { key: string; data: Box } | null;
    onSuccess: () => void;
}

export function BoxDialog({ open, onOpenChange, entity, editingBox, onSuccess }: BoxDialogProps) {
    const [loading, setLoading] = useState(false);
    const [boxName, setBoxName] = useState('');
    const [newBoxName, setNewBoxName] = useState('');
    const [currency, setCurrency] = useState('CLP');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        if (editingBox) {
            setBoxName(editingBox.key);
            setNewBoxName(editingBox.key);
            setCurrency(editingBox.data.currency || 'CLP');
            setIsDefault(editingBox.data.isDefault || false);
        } else {
            setBoxName('');
            setNewBoxName('');
            setCurrency('CLP');
            setIsDefault(false);
        }
    }, [editingBox, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nameToUse = editingBox ? newBoxName.trim() : boxName.trim();
        if (!nameToUse) return;

        setLoading(true);
        try {
            if (editingBox) {
                // Edit mode: update or rename box
                const currentBoxes = { ...entity.boxes };

                // If renaming, delete old key and create new one
                if (newBoxName !== editingBox.key) {
                    const boxData = currentBoxes[editingBox.key];
                    delete currentBoxes[editingBox.key];
                    currentBoxes[newBoxName] = {
                        ...boxData,
                        currency: currency || undefined,
                        isDefault
                    };
                } else {
                    // Just update properties
                    currentBoxes[editingBox.key] = {
                        ...currentBoxes[editingBox.key],
                        currency: currency || undefined,
                        isDefault
                    };
                }

                // If setting as default, unset all others
                if (isDefault) {
                    Object.keys(currentBoxes).forEach(key => {
                        if (key !== newBoxName) {
                            currentBoxes[key] = { ...currentBoxes[key], isDefault: false };
                        }
                    });
                }

                await updateEntity(entity.id, { boxes: currentBoxes });
            } else {
                // Create mode
                const currentBoxes = entity.boxes || {};
                const maxOrder = Math.max(0, ...Object.values(currentBoxes).map(b => b.order));
                const updatedBoxes = { ...currentBoxes };

                if (isDefault) {
                    Object.keys(updatedBoxes).forEach(key => {
                        updatedBoxes[key] = { ...updatedBoxes[key], isDefault: false };
                    });
                }

                updatedBoxes[boxName] = {
                    order: maxOrder + 1,
                    isDefault,
                    currency: currency || undefined
                };

                await updateEntity(entity.id, { boxes: updatedBoxes });
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving box:', error);
            alert('Error al guardar caja');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingBox ? 'Editar Caja' : 'Agregar Nueva Caja'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="boxName">Nombre de la Caja *</Label>
                        <Input
                            id="boxName"
                            placeholder="Ej: CC BCI, Efectivo, Cuenta Vista"
                            value={editingBox ? newBoxName : boxName}
                            onChange={(e) => editingBox ? setNewBoxName(e.target.value) : setBoxName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="currency">Moneda (opcional)</Label>
                        <Input
                            id="currency"
                            placeholder="CLP, USD, EUR"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <Label>Caja por defecto</Label>
                            <p className="text-xs text-muted-foreground">
                                Se seleccionarÃ¡ automÃ¡ticamente al crear movimientos
                            </p>
                        </div>
                        <Switch
                            checked={isDefault}
                            onCheckedChange={setIsDefault}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingBox ? 'Guardar' : 'Agregar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

