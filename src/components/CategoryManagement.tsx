/**
 * Numia v1.0 - Category Management Component
 */

import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { IconPicker, IconComponent } from '@/components/IconPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import type { Category } from '@/types';

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
}

export function CategoryManagement() {
  const { categories, createCategory, updateCategory, deleteCategory } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income');
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    icon: 'wallet',
    color: '#3b82f6',
    subcategories: [],
  });
  const [subcategoryInput, setSubcategoryInput] = useState('');
  const [saving, setSaving] = useState(false);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleOpenDialog = (type: 'income' | 'expense', category?: Category) => {
    setCategoryType(type);
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        icon: category.icon,
        color: category.color,
        subcategories: category.subcategories || [],
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        icon: 'wallet',
        color: '#3b82f6',
        subcategories: [],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      icon: 'Billetera',
      color: '#3b82f6',
      subcategories: [],
    });
    setSubcategoryInput('');
  };

  const handleAddSubcategory = () => {
    if (subcategoryInput.trim() && !formData.subcategories.includes(subcategoryInput.trim())) {
      setFormData({
        ...formData,
        subcategories: [...formData.subcategories, subcategoryInput.trim()],
      });
      setSubcategoryInput('');
    }
  };

  const handleRemoveSubcategory = (subcategory: string) => {
    setFormData({
      ...formData,
      subcategories: formData.subcategories.filter(s => s !== subcategory),
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre de la categoría es requerido');
      return;
    }

    try {
      setSaving(true);
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name,
          icon: formData.icon,
          color: formData.color,
          subcategories: formData.subcategories,
        });
      } else {
        await createCategory({
          name: formData.name,
          type: categoryType,
          icon: formData.icon,
          color: formData.color,
          subcategories: formData.subcategories,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    const confirmation = prompt(
      `⚠️ ATENCIÓN: Estás a punto de eliminar la categoría "${categoryName}".\n\n` +
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
      await deleteCategory(categoryId);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar la categoría');
    }
  };

  const renderCategoryList = (categoryList: Category[]) => {
    if (categoryList.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No hay categorías creadas. Crea tu primera categoría para comenzar.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {categoryList.map((category) => {
          return (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="p-2 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                >
                  <IconComponent iconKey={category.icon} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{category.name}</p>
                  {category.subcategories && category.subcategories.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {category.subcategories.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDialog(category.type, category)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(category.id, category.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Income Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Categorías de Ingresos</CardTitle>
                <CardDescription>Administra las categorías de ingresos</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleOpenDialog('income')}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderCategoryList(incomeCategories)}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Categorías de Gastos</CardTitle>
                <CardDescription>Administra las categorías de gastos</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleOpenDialog('expense')}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderCategoryList(expenseCategories)}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar' : 'Nueva'} Categoría de {categoryType === 'income' ? 'Ingresos' : 'Gastos'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Modifica' : 'Crea'} una categoría {categoryType === 'income' ? 'de ingresos' : 'de gastos'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Salario, Compras, etc."
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icon">Icono</Label>
                <div className="mt-2">
                  <IconPicker
                    value={formData.icon}
                    onChange={(icon) => setFormData({ ...formData, icon })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <div className="mt-2">
                  <ColorPicker
                    value={formData.color}
                    onChange={(color) => setFormData({ ...formData, color })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="subcategories">Subcategorías (opcional)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="subcategories"
                  value={subcategoryInput}
                  onChange={(e) => setSubcategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubcategory();
                    }
                  }}
                  placeholder="Agregar subcategoría..."
                />
                <Button type="button" variant="outline" onClick={handleAddSubcategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.subcategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.subcategories.map((sub) => (
                    <div
                      key={sub}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                    >
                      <Tag className="h-3 w-3" />
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcategory(sub)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editingCategory ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
