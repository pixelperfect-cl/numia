/**
 * Numia v1.0 - Entities Page
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { formatCurrency, calculateSummary } from '@/lib/utils';
import type { EntityType, Entity } from '@/types';
import { EntityBoxesDialog } from '@/components/EntityBoxesDialog';
import { IconPicker, IconComponent } from '@/components/IconPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { Upload, X } from 'lucide-react';

interface EntitiesProps {
  onEntitySelect?: (entityId: string) => void;
  hideHeader?: boolean;
}

export function Entities({ onEntitySelect, hideHeader = false }: EntitiesProps = {}) {
  const { entities, movements, createEntity, updateEntity, deleteEntity, loading } = useData();
  const { isBalanceHidden } = usePrivacy();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [boxesDialogEntity, setBoxesDialogEntity] = useState<Entity | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal' as EntityType,
    icon: 'Billetera',
    color: '#3b82f6',
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar 2MB');
        return;
      }
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      type: entity.type,
      icon: entity.icon || 'Billetera',
      color: entity.color || '#3b82f6',
    });
    if (entity.logoUrl) {
      setLogoPreview(entity.logoUrl);
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setUploading(true);

      if (editingEntity) {
        // Update existing entity
        const updates: any = {
          name: formData.name,
          type: formData.type,
          icon: formData.icon,
          color: formData.color,
        };

        // Convert and save new logo if selected
        if (logoFile) {
          const logoUrl = await fileToBase64(logoFile);
          updates.logoUrl = logoUrl;
        }

        await updateEntity(editingEntity.id, updates);
      } else {
        // Create new entity
        const newEntityData: any = {
          ...formData,
          boxes: {}
        };

        // Convert and save logo if selected
        if (logoFile) {
          const logoUrl = await fileToBase64(logoFile);
          newEntityData.logoUrl = logoUrl;
        }

        await createEntity(newEntityData);
      }

      setIsOpen(false);
      setEditingEntity(null);
      setFormData({ name: '', type: 'personal', icon: 'Billetera', color: '#3b82f6' });
      clearLogo();
    } catch (error) {
      console.error('Error saving entity:', error);
      alert('Error al guardar entidad');
    } finally {
      setUploading(false);
    }
  };


  const handleDelete = async (entityId: string, entityName: string) => {
    const entityMovements = movements.filter(m => m.entityId === entityId);

    let warningMsg = `⚠️ ATENCIÓN: Estás a punto de eliminar la entidad "${entityName}".\n\n`;

    if (entityMovements.length > 0) {
      warningMsg += `Esta entidad tiene ${entityMovements.length} movimientos registrados. AL ELIMINARLA SE BORRARÁN TODOS SUS DATOS.\n\n`;
    }

    const confirmation = prompt(
      warningMsg +
      `Esta acción NO se puede deshacer.\n\n` +
      `Para confirmar, escribe "ELIMINAR" (en mayúsculas):`
    );

    if (confirmation !== 'ELIMINAR') {
      if (confirmation !== null) {
        alert('Eliminación cancelada. Debes escribir exactamente "ELIMINAR" para confirmar.');
      }
      return;
    }

    try {
      await deleteEntity(entityId);
    } catch (error) {
      console.error('Error deleting entity:', error);
      alert('Error al eliminar entidad');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!hideHeader && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Entidades</h1>
            <p className="text-muted-foreground">Gestiona tus entidades personales y empresariales</p>
          </div>
        )}
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingEntity(null);
            setFormData({ name: '', type: 'personal', icon: 'Billetera', color: '#3b82f6' });
            clearLogo();
          }
        }}>
          <DialogTrigger asChild>
            <Button>+ Nueva Entidad</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEntity ? 'Editar Entidad' : 'Crear Nueva Entidad'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Personal, Mi Empresa"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value: EntityType) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Icono</Label>
                <IconPicker
                  value={formData.icon}
                  onChange={(icon) => setFormData({ ...formData, icon })}
                />
              </div>
              <div>
                <Label>Color</Label>
                <ColorPicker
                  value={formData.color}
                  onChange={(color) => setFormData({ ...formData, color })}
                />
              </div>
              <div>
                <Label htmlFor="logo">Logo (opcional)</Label>
                <div className="space-y-2">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="w-full h-20 object-contain border rounded-md bg-muted/50"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={clearLogo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="logo" className="flex items-center justify-center gap-2 h-20 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Subir logo horizontal (max 2MB)
                      </span>
                    </label>
                  )}
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato horizontal recomendado. Se mostrará en el panel de la entidad.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Guardando...' : editingEntity ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div>Cargando...</div>
      ) : entities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold mb-2">No hay entidades</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primera entidad para comenzar a gestionar tus finanzas
            </p>
            <Button onClick={() => setIsOpen(true)}>+ Nueva Entidad</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => {
            const entityMovements = movements.filter(m => m.entityId === entity.id);
            const summary = calculateSummary(entityMovements);
            const boxCount = Object.keys(entity.boxes || {}).length;

            return (
              <Card
                key={entity.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onEntitySelect?.(entity.id)}
              >
                <CardHeader>
                  {entity.logoUrl ? (
                    <div className="mb-3">
                      <img
                        src={entity.logoUrl}
                        alt={entity.name}
                        className="h-12 w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${entity.color}20`, color: entity.color || '#3b82f6' }}
                    >
                      <IconComponent iconKey={entity.icon} className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{entity.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">{entity.type}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className={`text-lg font-bold ${summary.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                        {isBalanceHidden ? '****' : formatCurrency(summary.balance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Ingresos</span>
                      <span className="text-blue-600 dark:text-blue-500">{isBalanceHidden ? '****' : formatCurrency(summary.income)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Gastos</span>
                      <span className="text-red-600 dark:text-red-500">{isBalanceHidden ? '****' : formatCurrency(summary.expenses)}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {boxCount} {boxCount === 1 ? 'caja' : 'cajas'} • {entityMovements.length} movimientos
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(entity);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBoxesDialogEntity(entity);
                          }}
                        >
                          Cajas
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entity.id, entity.name);
                        }}
                        disabled={entityMovements.length > 0}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Boxes Management Dialog */}
      <EntityBoxesDialog
        entity={boxesDialogEntity}
        open={!!boxesDialogEntity}
        onOpenChange={(open) => !open && setBoxesDialogEntity(null)}
      />
    </div>
  );
}
