/**
 * Numia v1.0 - Entity Boxes Management Dialog
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Entity, Box } from '@/types';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, calculateBoxBalances, getCurrencySymbol } from '@/lib/utils';

interface EntityBoxesDialogProps {
  entity: Entity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntityBoxesDialog({ entity, open, onOpenChange }: EntityBoxesDialogProps) {
  const { movements, updateEntity } = useData();
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [newBoxName, setNewBoxName] = useState('');
  const [newBoxCurrency, setNewBoxCurrency] = useState('CLP');

  // Update boxes state when entity changes
  useEffect(() => {
    if (entity?.boxes) {
      setBoxes(entity.boxes);
    } else {
      setBoxes({});
    }
  }, [entity]);

  if (!entity) return null;

  // Calculate balances for display
  const entityMovements = movements.filter(m => m.entityId === entity.id);
  const boxBalances = calculateBoxBalances(entityMovements);

  const handleAddBox = () => {
    if (!newBoxName.trim()) return;
    if (boxes[newBoxName]) {
      alert('Ya existe una caja con ese nombre');
      return;
    }

    setBoxes({
      ...boxes,
      [newBoxName]: {
        order: Object.keys(boxes).length + 1,
        isDefault: Object.keys(boxes).length === 0,
        currency: newBoxCurrency,
      },
    });
    setNewBoxName('');
    setNewBoxCurrency('CLP');
  };

  const handleRemoveBox = (boxName: string) => {
    const balance = boxBalances[boxName] || 0;
    if (balance !== 0) {
      alert('No puedes eliminar una caja con balance diferente de $0');
      return;
    }

    const confirmation = prompt(
      `⚠️ ATENCIÓN: Estás a punto de eliminar la caja "${boxName}".\n\n` +
      `Esta acción NO se puede deshacer.\n\n` +
      `Para confirmar, escribe "ELIMINAR" (en mayúsculas):`
    );

    if (confirmation !== 'ELIMINAR') {
      if (confirmation !== null) {
        alert('Eliminación cancelada. Debes escribir exactamente "ELIMINAR" para confirmar.');
      }
      return;
    }

    const updated = { ...boxes };
    delete updated[boxName];
    setBoxes(updated);
  };

  const handleSetDefault = (boxName: string) => {
    const updated = Object.keys(boxes).reduce((acc, key) => {
      acc[key] = {
        ...boxes[key],
        isDefault: key === boxName,
      };
      return acc;
    }, {} as Record<string, Box>);
    setBoxes(updated);
  };

  const handleCurrencyChange = (boxName: string, currency: string) => {
    setBoxes({
      ...boxes,
      [boxName]: {
        ...boxes[boxName],
        currency,
      },
    });
  };

  const handleSave = async () => {
    try {
      await updateEntity(entity.id, { boxes });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating boxes:', error);
      alert('Error al actualizar cajas');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Gestionar Cajas - {entity.icon} {entity.name}
          </DialogTitle>
          <DialogDescription>
            Agrega, modifica o elimina las cajas de esta entidad
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new box */}
          <div className="space-y-2">
            <Label>Nueva Caja</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="newBox"
                  value={newBoxName}
                  onChange={(e) => setNewBoxName(e.target.value)}
                  placeholder="Ej: Banco Estado, PayPal"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBox();
                    }
                  }}
                />
              </div>
              <div className="w-32">
                <Select value={newBoxCurrency} onValueChange={setNewBoxCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLP">CLP ($)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="ARS">ARS ($)</SelectItem>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center">
                <Button onClick={handleAddBox}>Agregar</Button>
              </div>
            </div>
          </div>

          {/* List of boxes */}
          <div className="space-y-2">
            <Label>Cajas Existentes</Label>
            {Object.keys(boxes).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay cajas configuradas</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(boxes)
                  .sort(([, a], [, b]) => a.order - b.order)
                  .map(([boxName, boxData]) => {
                    const balance = boxBalances[boxName] || 0;
                    return (
                      <div
                        key={boxName}
                        className="flex flex-col gap-2 p-3 rounded-lg border"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{boxName}</span>
                              {boxData.isDefault && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                  Por defecto
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Balance: <span className={balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}>
                                {formatCurrency(balance, boxData.currency || 'CLP')}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!boxData.isDefault && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetDefault(boxName)}
                              >
                                Hacer predeterminada
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveBox(boxName)}
                              disabled={balance !== 0}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`currency-${boxName}`} className="text-xs text-muted-foreground">
                            Moneda:
                          </Label>
                          <Select
                            value={boxData.currency || 'CLP'}
                            onValueChange={(value) => handleCurrencyChange(boxName, value)}
                          >
                            <SelectTrigger id={`currency-${boxName}`} className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CLP">CLP ($)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="ARS">ARS ($)</SelectItem>
                              <SelectItem value="BRL">BRL (R$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-1">💡 Información:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Solo puedes eliminar cajas con balance $0</li>
              <li>Los balances se calculan automáticamente desde los movimientos</li>
              <li>La caja predeterminada se selecciona automáticamente al crear movimientos</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar Cambios</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
