import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BoxDialog } from '@/components/BoxDialog';
import { deleteBox, updateBox } from '@/lib/supabase/database';
import { Edit, Trash2, Star } from 'lucide-react';
import type { Entity } from '@/types';

interface BoxesPanelProps {
    entity: Entity;
    onUpdate: () => void;
}

export function BoxesPanel({ entity, onUpdate }: BoxesPanelProps) {
    const [boxDialogOpen, setBoxDialogOpen] = useState(false);
    const [editingBox, setEditingBox] = useState<{ key: string; data: any } | null>(null);

    const handleDelete = async (boxKey: string) => {
        const boxCount = Object.keys(entity.boxes || {}).length;
        if (boxCount <= 1) {
            alert('No puedes eliminar la última caja');
            return;
        }

        if (!confirm(`¿Estás seguro de eliminar la caja "${boxKey}"?`)) return;

        try {
            await deleteBox(entity.id, boxKey);
            onUpdate();
        } catch (error) {
            console.error('Error deleting box:', error);
            alert('Error al eliminar caja');
        }
    };

    const handleSetDefault = async (boxKey: string) => {
        try {
            await updateBox(entity.id, boxKey, { isDefault: true });
            onUpdate();
        } catch (error) {
            console.error('Error setting default box:', error);
            alert('Error al establecer caja por defecto');
        }
    };

    const handleEdit = (boxKey: string) => {
        const boxData = entity.boxes[boxKey];
        setEditingBox({ key: boxKey, data: boxData });
        setBoxDialogOpen(true);
    };

    const handleDialogClose = () => {
        setBoxDialogOpen(false);
        setEditingBox(null);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Cajas</CardTitle>
                    <CardDescription>Administra las cajas/cuentas disponibles para esta entidad</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Cajas Actuales</Label>
                        <div className="space-y-2">
                            {entity.boxes && Object.entries(entity.boxes).map(([boxName, boxData]) => (
                                <div key={boxName} className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium">{boxName}</div>
                                        {boxData.isDefault && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded flex items-center gap-1">
                                                <Star className="h-3 w-3" /> Por defecto
                                            </span>
                                        )}
                                        {boxData.currency && (
                                            <span className="text-xs text-muted-foreground">
                                                {boxData.currency}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(boxName)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {!boxData.isDefault && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleSetDefault(boxName)}
                                                title="Establecer como predeterminada"
                                            >
                                                <Star className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(boxName)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setBoxDialogOpen(true)}>
                        + Agregar Nueva Caja
                    </Button>
                </CardContent>
            </Card>

            <BoxDialog
                open={boxDialogOpen}
                onOpenChange={handleDialogClose}
                entity={entity}
                editingBox={editingBox}
                onSuccess={() => {
                    onUpdate();
                    handleDialogClose();
                }}
            />
        </div>
    );
}

