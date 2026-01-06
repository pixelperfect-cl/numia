/**
 * Numia v1.0 - Transfer Dialog Component
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { getTodayLocalDateString } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDialog({ open, onOpenChange }: TransferDialogProps) {
  const { entities, createTransfer } = useData();
  const [formData, setFormData] = useState({
    fromEntityId: '',
    toEntityId: '',
    fromBox: '',
    toBox: '',
    amount: '',
    description: '',
    date: getTodayLocalDateString(),
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        fromEntityId: '',
        toEntityId: '',
        fromBox: '',
        toBox: '',
        amount: '',
        description: '',
        date: getTodayLocalDateString(),
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fromEntityId) {
      alert('Selecciona la entidad de origen');
      return;
    }
    if (!formData.toEntityId) {
      alert('Selecciona la entidad de destino');
      return;
    }
    if (formData.fromEntityId === formData.toEntityId && formData.fromBox === formData.toBox) {
      alert('No puedes transferir a la misma caja de la misma entidad');
      return;
    }
    if (!formData.fromBox) {
      alert('Selecciona la caja de origen');
      return;
    }
    if (!formData.toBox) {
      alert('Selecciona la caja de destino');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    try {
      await createTransfer({
        fromEntityId: formData.fromEntityId,
        toEntityId: formData.toEntityId,
        fromBox: formData.fromBox,
        toBox: formData.toBox,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating transfer:', error);
      alert('Error al crear la transferencia');
    }
  };

  // Get boxes from selected entities
  const fromEntity = entities.find(e => e.id === formData.fromEntityId);
  const toEntity = entities.find(e => e.id === formData.toEntityId);
  const fromBoxes = fromEntity ? Object.keys(fromEntity.boxes || { 'Efectivo': {} }) : [];
  const toBoxes = toEntity ? Object.keys(toEntity.boxes || { 'Efectivo': {} }) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Transferencia</DialogTitle>
          <DialogDescription>
            Transfiere saldo de una entidad/caja a otra
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* From Section */}
            <div className="space-y-4 p-4 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <h3 className="font-semibold text-sm">Desde (Origen)</h3>
              </div>
              <div>
                <Label htmlFor="from-entity">Entidad de Origen</Label>
                <Select
                  value={formData.fromEntityId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, fromEntityId: value, fromBox: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona entidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem
                        key={entity.id}
                        value={entity.id}
                        disabled={entity.id === formData.toEntityId && formData.toBox !== ''}
                      >
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="from-box">Caja de Origen</Label>
                <Select
                  value={formData.fromBox}
                  onValueChange={(value) => setFormData({ ...formData, fromBox: value })}
                  disabled={!formData.fromEntityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona caja" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromBoxes.map((box) => (
                      <SelectItem key={box} value={box}>
                        {box}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* To Section */}
            <div className="space-y-4 p-4 rounded-lg border border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <h3 className="font-semibold text-sm">Hacia (Destino)</h3>
              </div>
              <div>
                <Label htmlFor="to-entity">Entidad de Destino</Label>
                <Select
                  value={formData.toEntityId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, toEntityId: value, toBox: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona entidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="to-box">Caja de Destino</Label>
                <Select
                  value={formData.toBox}
                  onValueChange={(value) => setFormData({ ...formData, toBox: value })}
                  disabled={!formData.toEntityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona caja" />
                  </SelectTrigger>
                  <SelectContent>
                    {toBoxes.map((box) => (
                      <SelectItem key={box} value={box}>
                        {box}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Transfer Details */}
          <div className="flex items-center justify-center -my-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs">
              <span className="text-red-600 dark:text-red-500">
                {formData.fromEntityId ? entities.find(e => e.id === formData.fromEntityId)?.name : '---'}
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-blue-600 dark:text-blue-500">
                {formData.toEntityId ? entities.find(e => e.id === formData.toEntityId)?.name : '---'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Monto a Transferir</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Traspaso de fondos para..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear Transferencia</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
