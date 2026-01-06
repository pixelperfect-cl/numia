/**
 * Numia v1.0 - Financial Projections Page
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, getTodayLocalDateString } from '@/lib/utils';
import type { MovementType } from '@/types';
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { IconComponent } from '@/components/IconPicker';

interface ProjectionsProps {
  openDialog?: boolean;
  onDialogClose?: () => void;
}

export function Projections({ openDialog = false, onDialogClose }: ProjectionsProps = {}) {
  const { entities, categories, projections, createProjection, updateProjection, deleteProjection, createMovement, loading } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProjection, setEditingProjection] = useState<any>(null);
  const [itemType, setItemType] = useState<MovementType>('income');
  const [formData, setFormData] = useState({
    entityId: '',
    categoryId: '',
    description: '',
    amount: '',
  });

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  const getAvailableCategories = (type: MovementType) => {
    return categories.filter(c => c.type === type);
  };

  const handleOpenDialog = (type: MovementType, projection?: any) => {
    setItemType(type);

    if (projection) {
      // Editing existing projection
      setEditingProjection(projection);
      const items = type === 'income' ? getIncomeItems(projection) : getExpenseItems(projection);
      const item = items[0];
      const categoryId = getCategoryId(item);

      setFormData({
        entityId: projection.entityId,
        categoryId: categoryId,
        description: item.description || '',
        amount: item.amount.toString(),
      });
    } else {
      // Creating new projection
      setEditingProjection(null);
      setFormData({
        entityId: '',
        categoryId: '',
        description: '',
        amount: '',
      });
    }

    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityId) {
      alert('Selecciona una entidad');
      return;
    }
    if (!formData.categoryId) {
      alert('Selecciona una categoría');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    try {
      // Create/update projection with single item
      const incomeItems = itemType === 'income' ? [{
        categoryId: formData.categoryId,
        description: formData.description,
        amount: parseFloat(formData.amount)
      }] : [];

      const expenseItems = itemType === 'expense' ? [{
        categoryId: formData.categoryId,
        description: formData.description,
        amount: parseFloat(formData.amount)
      }] : [];

      const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);

      const projectionData = {
        name: `${itemType === 'income' ? 'Ingreso' : 'Gasto'}: ${formData.description || 'Sin descripción'}`,
        entityId: formData.entityId,
        periodType: 'monthly' as const,
        period: new Date().toISOString().slice(0, 7), // Current month
        fixedIncome: incomeItems,
        fixedExpenses: expenseItems,
        totals: {
          totalIncome,
          totalExpenses,
          availableBalance: totalIncome - totalExpenses
        }
      };

      if (editingProjection) {
        // Update existing projection
        await updateProjection(editingProjection.id, projectionData);
      } else {
        // Create new projection
        await createProjection(projectionData);
      }

      setIsOpen(false);
      setEditingProjection(null);
      setFormData({
        entityId: '',
        categoryId: '',
        description: '',
        amount: '',
      });
    } catch (error) {
      console.error('Error saving projection:', error);
      alert('Error al guardar proyección');
    }
  };

  const handleDelete = async (projectionId: string, projectionName: string) => {
    const confirmation = prompt(
      `⚠️ ATENCIÓN: Estás a punto de eliminar la proyección "${projectionName}".\n\n` +
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
      await deleteProjection(projectionId);
    } catch (error) {
      console.error('Error deleting projection:', error);
      alert('Error al eliminar proyección');
    }
  };

  // Calculate totals from all projections (with safety check)
  const allIncome = (projections || []).reduce((sum, p) => sum + p.totals.totalIncome, 0);
  const allExpenses = (projections || []).reduce((sum, p) => sum + p.totals.totalExpenses, 0);
  const balance = allIncome - allExpenses;

  // Helper function to get income items (compatible with old and new structure)
  const getIncomeItems = (projection: any) => {
    return projection.incomeItems || projection.fixedIncome || [];
  };

  // Helper function to get expense items (compatible with old and new structure)
  const getExpenseItems = (projection: any) => {
    return projection.expenseItems || projection.fixedExpenses || [];
  };

  // Helper function to get categoryId (compatible with old and new structure)
  const getCategoryId = (item: any) => {
    if (item.categoryId) return item.categoryId;
    if (item.category) {
      // Old format might have "categoryId:subcategory", extract just the categoryId
      return item.category.split(':')[0];
    }
    return '';
  };

  const handleRegisterMovement = async (projection: any, type: MovementType) => {
    const items = type === 'income' ? getIncomeItems(projection) : getExpenseItems(projection);
    const item = items[0];
    const categoryId = getCategoryId(item);

    // Find entity to get default box
    const entity = entities.find(e => e.id === projection.entityId);
    const defaultBox = entity?.boxes ? Object.entries(entity.boxes).find(([, data]: [string, any]) => data.isDefault)?.[0] : '';

    if (!defaultBox) {
      alert('La entidad no tiene una caja predeterminada. Por favor configura las cajas primero.');
      return;
    }

    try {
      await createMovement({
        type: type,
        amount: item.amount,
        description: item.description || `${type === 'income' ? 'Ingreso' : 'Gasto'} proyectado`,
        categoryId: categoryId,
        box: defaultBox,
        entityId: projection.entityId,
        date: getTodayLocalDateString(),
      });

      alert('Movimiento registrado exitosamente');
    } catch (error) {
      console.error('Error registering movement:', error);
      alert('Error al registrar movimiento');
    }
  };

  // Group projections by entity
  const projectionsGroupedByEntity = (projections || []).reduce((acc: Record<string, any[]>, projection) => {
    const entityId = projection.entityId;
    if (!acc[entityId]) {
      acc[entityId] = [];
    }
    acc[entityId].push(projection);
    return acc;
  }, {});

  // Calculate totals per entity
  const getEntityTotals = (entityId: string) => {
    const entityProjections = projectionsGroupedByEntity[entityId] || [];

    const totalIncome = entityProjections.reduce((sum, p) => {
      const items = getIncomeItems(p);
      return sum + items.reduce((s, item) => s + item.amount, 0);
    }, 0);

    const totalExpenses = entityProjections.reduce((sum, p) => {
      const items = getExpenseItems(p);
      return sum + items.reduce((s, item) => s + item.amount, 0);
    }, 0);

    const balance = totalIncome - totalExpenses;
    const total = totalIncome + totalExpenses;
    const incomePercentage = total > 0 ? (totalIncome / total) * 100 : 50;
    const expensePercentage = total > 0 ? (totalExpenses / total) * 100 : 50;

    return {
      totalIncome,
      totalExpenses,
      balance,
      incomePercentage,
      expensePercentage,
    };
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyección Financiera</h1>
          <p className="text-muted-foreground">Planifica tus ingresos y gastos fijos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleOpenDialog('income')} className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Agregar Ingreso
          </Button>
          <Button onClick={() => handleOpenDialog('expense')} variant="outline" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Agregar Gasto
          </Button>
        </div>
      </div>

      {/* Total Summary Bar - All Entities Combined */}
      {projections && projections.length > 0 && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>Resumen Total - Todas las Entidades</span>
            </CardTitle>

            {/* Street Fighter Style Bar - Total */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-blue-600 dark:text-blue-500">
                  INGRESOS TOTALES: {formatCurrency(allIncome)}
                </span>
                <span className="font-bold text-red-600 dark:text-red-500">
                  GASTOS TOTALES: {formatCurrency(allExpenses)}
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="relative h-10 bg-muted rounded-lg overflow-hidden flex">
                {/* Income Bar (Left Side - Blue) */}
                <div
                  className="bg-blue-600 dark:bg-blue-500 transition-all duration-500 flex items-center justify-start px-3"
                  style={{ width: `${allIncome + allExpenses > 0 ? (allIncome / (allIncome + allExpenses)) * 100 : 50}%` }}
                >
                  {allIncome + allExpenses > 0 && (allIncome / (allIncome + allExpenses)) * 100 > 15 && (
                    <span className="text-sm font-bold text-white">
                      {Math.round((allIncome / (allIncome + allExpenses)) * 100)}%
                    </span>
                  )}
                </div>
                {/* Expense Bar (Right Side - Red) */}
                <div
                  className="bg-red-600 dark:bg-red-500 transition-all duration-500 flex items-center justify-end px-3"
                  style={{ width: `${allIncome + allExpenses > 0 ? (allExpenses / (allIncome + allExpenses)) * 100 : 50}%` }}
                >
                  {allIncome + allExpenses > 0 && (allExpenses / (allIncome + allExpenses)) * 100 > 15 && (
                    <span className="text-sm font-bold text-white">
                      {Math.round((allExpenses / (allIncome + allExpenses)) * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Balance */}
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">Balance Disponible Total</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos Proyectados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
              {formatCurrency(allIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos Proyectados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">
              {formatCurrency(allExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Balance Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projections List - Grouped by Entity */}
      {!projections || projections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-lg font-semibold mb-2">Sin Proyecciones</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Agrega ingresos y gastos fijos para planificar tu balance disponible.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => handleOpenDialog('income')} disabled={entities.length === 0}>
                {entities.length === 0 ? 'Crea una entidad primero' : '+ Agregar Ingreso'}
              </Button>
              <Button onClick={() => handleOpenDialog('expense')} variant="outline" disabled={entities.length === 0}>
                + Agregar Gasto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Iterate over entities with projections */}
          {Object.keys(projectionsGroupedByEntity).map((entityId) => {
            const entity = entities.find(e => e.id === entityId);
            if (!entity) return null;

            const entityProjections = projectionsGroupedByEntity[entityId];
            const { totalIncome, totalExpenses, balance, incomePercentage, expensePercentage } = getEntityTotals(entityId);

            const incomeProjections = entityProjections.filter(p => getIncomeItems(p).length > 0);
            const expenseProjections = entityProjections.filter(p => getExpenseItems(p).length > 0);

            return (
              <Card key={entityId}>
                <CardHeader>
                  {/* Entity Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${entity.color}20`, color: entity.color || '#3b82f6' }}
                    >
                      <IconComponent iconKey={entity.icon} className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{entity.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Proyecciones financieras</p>
                    </div>
                  </div>

                  {/* Street Fighter Style Bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-blue-600 dark:text-blue-500">
                        INGRESOS: {formatCurrency(totalIncome)}
                      </span>
                      <span className="font-medium text-red-600 dark:text-red-500">
                        GASTOS: {formatCurrency(totalExpenses)}
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="relative h-8 bg-muted rounded-lg overflow-hidden flex">
                      {/* Income Bar (Left Side - Blue) */}
                      <div
                        className="bg-blue-600 dark:bg-blue-500 transition-all duration-500 flex items-center justify-start px-2"
                        style={{ width: `${incomePercentage}%` }}
                      >
                        {incomePercentage > 15 && (
                          <span className="text-xs font-bold text-white">
                            {Math.round(incomePercentage)}%
                          </span>
                        )}
                      </div>
                      {/* Expense Bar (Right Side - Red) */}
                      <div
                        className="bg-red-600 dark:bg-red-500 transition-all duration-500 flex items-center justify-end px-2"
                        style={{ width: `${expensePercentage}%` }}
                      >
                        {expensePercentage > 15 && (
                          <span className="text-xs font-bold text-white">
                            {Math.round(expensePercentage)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Balance Disponible</p>
                      <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Income Items */}
                  {incomeProjections.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                        <h4 className="text-sm font-semibold">Ingresos</h4>
                      </div>
                      <div className="space-y-2">
                        {incomeProjections.map((projection) => {
                          const items = getIncomeItems(projection);
                          const item = items[0];
                          const categoryId = getCategoryId(item);
                          const category = categories.find(c => c.id === categoryId);
                          return (
                            <div key={projection.id} className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.description || category?.name || 'Sin descripción'}</p>
                                <p className="text-xs text-muted-foreground truncate">{category?.name}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-500">
                                  {formatCurrency(item.amount)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRegisterMovement(projection, 'income')}
                                  title="Registrar movimiento"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenDialog('income', projection)}
                                  title="Editar"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(projection.id, projection.name)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expense Items */}
                  {expenseProjections.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-500" />
                        <h4 className="text-sm font-semibold">Gastos</h4>
                      </div>
                      <div className="space-y-2">
                        {expenseProjections.map((projection) => {
                          const items = getExpenseItems(projection);
                          const item = items[0];
                          const categoryId = getCategoryId(item);
                          const category = categories.find(c => c.id === categoryId);
                          return (
                            <div key={projection.id} className="flex items-center justify-between p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.description || category?.name || 'Sin descripción'}</p>
                                <p className="text-xs text-muted-foreground truncate">{category?.name}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-sm font-semibold text-red-600 dark:text-red-500">
                                  {formatCurrency(item.amount)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRegisterMovement(projection, 'expense')}
                                  title="Registrar movimiento"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenDialog('expense', projection)}
                                  title="Editar"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(projection.id, projection.name)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProjection ? 'Editar' : 'Agregar'} {itemType === 'income' ? 'Ingreso' : 'Gasto'} Proyectado
            </DialogTitle>
            <DialogDescription>
              {editingProjection ? 'Modifica' : 'Define'} un {itemType === 'income' ? 'ingreso' : 'gasto'} fijo para tu proyección financiera
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="entity">Entidad</Label>
              <Select value={formData.entityId} onValueChange={(value) => setFormData({ ...formData, entityId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una entidad" />
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
              <Label htmlFor="category">Categoría</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCategories(itemType).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej: Sueldo mensual, Arriendo, etc."
              />
            </div>

            <div>
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => {
                setIsOpen(false);
                setEditingProjection(null);
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProjection ? 'Guardar Cambios' : `Agregar ${itemType === 'income' ? 'Ingreso' : 'Gasto'}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
