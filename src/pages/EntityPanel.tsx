/**
 * Numia v1.0 - Entity Panel Page
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, calculateSummary, calculateBoxBalances, getTodayLocalDateString, parseLocalDate } from '@/lib/utils';
import { IconComponent } from '@/components/IconPicker';
import { TrendingUp, TrendingDown, ArrowLeft, Edit, History, Trash2, ChevronLeft, ChevronRight, Calendar, ArrowLeftRight, Loader2 } from 'lucide-react';
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart';
import { MovementsAreaChart } from '@/components/MovementsAreaChart';
import { CategoryPieChart } from '@/components/CategoryPieChart';
import { InteractiveCashFlowChart } from '@/components/InteractiveCashFlowChart';
import type { Movement, MovementType, MovementHistoryEntry } from '@/types';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface EntityPanelProps {
  entityId: string;
  onBack: () => void;
  openMovementDialog?: boolean;
  onMovementDialogClose?: () => void;
}

export function EntityPanel({ entityId, onBack, openMovementDialog, onMovementDialogClose }: EntityPanelProps) {
  const { entities, movements, categories, createMovement, updateMovement, deleteMovement, loading } = useData();
  const { user } = useAuth();
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [historyMovement, setHistoryMovement] = useState<Movement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<Movement | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income' as MovementType,
    amount: '',
    description: '',
    categoryValue: '', // Format: "categoryId" or "categoryId:subcategory"
    box: '',
    date: getTodayLocalDateString(),
  });
  const [createFormData, setCreateFormData] = useState({
    type: 'income' as MovementType,
    amount: '',
    description: '',
    categoryValue: '', // Format: "categoryId" or "categoryId:subcategory"
    box: '',
    date: getTodayLocalDateString(),
  });

  // State for month pagination
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Handle external dialog open request
  useEffect(() => {
    if (openMovementDialog) {
      setIsCreateOpen(true);
      onMovementDialogClose?.();
    }
  }, [openMovementDialog, onMovementDialogClose]);

  const entity = entities.find(e => e.id === entityId);

  const handleEdit = (movement: Movement) => {
    setEditingMovement(movement);
    // Reconstruct categoryValue from categoryId and subcategory
    const categoryValue = movement.subcategory
      ? `${movement.categoryId}:${movement.subcategory}`
      : movement.categoryId || movement.category || '';

    setFormData({
      type: movement.type,
      amount: movement.amount.toString(),
      description: movement.description || '',
      categoryValue,
      box: movement.box,
      date: movement.date,
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (movement: Movement) => {
    setDeletingMovement(movement);
    setDeleteConfirmation('');
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmation !== 'ELIMINAR' || !deletingMovement) return;

    try {
      await deleteMovement(deletingMovement.id);
      setDeletingMovement(null);
      setDeleteConfirmation('');
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Error al eliminar movimiento');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement || !user) return;
    if (!formData.categoryValue) {
      alert('Selecciona una categoría');
      return;
    }

    // Parse categoryValue to extract categoryId and subcategory
    const [categoryId, subcategory] = formData.categoryValue.includes(':')
      ? formData.categoryValue.split(':')
      : [formData.categoryValue, undefined];

    try {
      // Track changes for history
      const changes: MovementHistoryEntry[] = [];

      // Compare categoryValue
      const oldCategoryValue = editingMovement.subcategory
        ? `${editingMovement.categoryId}:${editingMovement.subcategory}`
        : editingMovement.categoryId;

      if (oldCategoryValue !== formData.categoryValue) {
        changes.push({
          timestamp: new Date(),
          field: 'category',
          oldValue: oldCategoryValue,
          newValue: formData.categoryValue,
          userId: user.uid,
        });
      }

      // Track other changes
      const otherFields: Array<keyof typeof formData> = ['type', 'amount', 'description', 'box', 'date'];
      otherFields.forEach((field) => {
        const oldValue = field === 'amount' ? editingMovement[field].toString() : editingMovement[field as keyof Movement];
        const newValue = formData[field];

        if (oldValue !== newValue) {
          changes.push({
            timestamp: new Date(),
            field,
            oldValue,
            newValue,
            userId: user.uid,
          });
        }
      });

      const history = [...(editingMovement.history || []), ...changes];

      // Create update data object
      const updateData: any = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        categoryId,
        box: formData.box,
        date: formData.date,
        history,
      };

      // Add subcategory field: either the value or explicitly null (not undefined)
      updateData.subcategory = subcategory || null;

      await updateMovement(editingMovement.id, updateData);

      setIsEditOpen(false);
      setEditingMovement(null);
      setFormData({
        type: 'income',
        amount: '',
        description: '',
        categoryValue: '',
        box: '',
        date: getTodayLocalDateString(),
      });
    } catch (error) {
      console.error('Error updating movement:', error);
      alert('Error al actualizar movimiento');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.categoryValue) {
      alert('Selecciona una categoría');
      return;
    }
    if (!createFormData.box) {
      alert('Selecciona una caja');
      return;
    }

    // Parse categoryValue to extract categoryId and subcategory
    const [categoryId, subcategory] = createFormData.categoryValue.includes(':')
      ? createFormData.categoryValue.split(':')
      : [createFormData.categoryValue, undefined];

    try {
      // Create movement data object
      const movementData: any = {
        type: createFormData.type,
        amount: parseFloat(createFormData.amount),
        description: createFormData.description,
        categoryId,
        box: createFormData.box,
        entityId: entityId, // Pre-fill with current entity
        date: createFormData.date,
        subcategory: subcategory || null, // explicitly null if no subcategory
      };

      await createMovement(movementData);

      setIsCreateOpen(false);
      setCreateFormData({
        type: 'income',
        amount: '',
        description: '',
        categoryValue: '',
        box: '',
        date: getTodayLocalDateString(),
      });
    } catch (error) {
      console.error('Error creating movement:', error);
      alert('Error al crear movimiento');
    }
  };

  // Get categories based on movement type
  const getAvailableCategories = (type: MovementType) => {
    return categories.filter(c => c.type === type);
  };

  // Handle type change - reset category when type changes
  const handleTypeChange = (newType: MovementType) => {
    setCreateFormData({ ...createFormData, type: newType, categoryValue: '' });
  };

  // Handle type change for edit form
  const handleEditTypeChange = (newType: MovementType) => {
    setFormData({ ...formData, type: newType, categoryValue: '' });
  };

  // Get boxes from entity
  const availableBoxes = entity ? Object.keys(entity.boxes || {}) : [];

  // Group movements by month
  const groupMovementsByMonth = (movements: Movement[]): Record<string, Movement[]> => {
    const groups: Record<string, Movement[]> = {};
    movements.forEach(movement => {
      const date = parseLocalDate(movement.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(movement);
    });
    return groups;
  };

  // Format month key to display string
  const formatMonthKey = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  };

  // Navigate to previous month
  const navigateToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() - 1);
    const newMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthKey);
  };

  // Navigate to next month
  const navigateToNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() + 1);
    const newMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthKey);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Cargando entidades...</p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Entidad no encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const entityMovements = movements.filter(m => m.entityId === entity.id);
  const summary = calculateSummary(entityMovements);

  // Group movements by month and get available months
  const movementsByMonth = groupMovementsByMonth(entityMovements);
  const availableMonths = Object.keys(movementsByMonth).sort((a, b) => b.localeCompare(a)); // Most recent first

  // Get movements for selected month
  const currentMonthMovements = movementsByMonth[selectedMonth] || [];

  // Check if previous/next month exists
  const hasPreviousMonth = availableMonths.some(month => month < selectedMonth);
  const hasNextMonth = availableMonths.some(month => month > selectedMonth);

  // Convert box balances to array and include all entity boxes (even with 0 balance)
  const boxBalancesObj = calculateBoxBalances(entityMovements);
  const allBoxes = Object.keys(entity.boxes || {});
  const boxBalances = allBoxes.map((box) => ({
    box,
    balance: boxBalancesObj[box] || 0
  }));

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} size="icon" className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {entity.logoUrl ? (
            <img src={entity.logoUrl} alt={entity.name} className="h-12 object-contain flex-shrink-0" />
          ) : (
            <div
              className="p-2 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${entity.color}20`, color: entity.color || '#3b82f6' }}
            >
              <IconComponent iconKey={entity.icon} className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight truncate">{entity.name}</h1>
            <p className="text-muted-foreground capitalize">{entity.type}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold break-words ${summary.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
              {formatCurrency(summary.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Balance actual
            </p>
            {/* Boxes */}
            {boxBalances.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay cajas</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {boxBalances.map((boxBalance) => (
                  <div key={boxBalance.box} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs">
                    <span className="font-medium text-muted-foreground">{boxBalance.box}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className={`font-bold ${boxBalance.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                      {formatCurrency(boxBalance.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500 break-words">
              {formatCurrency(summary.income)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de ingresos
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500 break-words">
              {formatCurrency(summary.expenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de gastos
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <ArrowLeftRight className="h-5 w-5 text-purple-600 dark:text-purple-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-500 break-words">
              {entityMovements.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registros totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Cash Flow Chart */}
      <InteractiveCashFlowChart movements={entityMovements} />

      {/* Income/Expense Chart */}
      <IncomeExpenseChart movements={entityMovements} />

      {/* Movements Activity Chart */}
      <MovementsAreaChart movements={entityMovements} />

      {/* Category Distribution Charts */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <CategoryPieChart movements={entityMovements} categories={categories} type="income" />
        <CategoryPieChart movements={entityMovements} categories={categories} type="expense" />
      </div>

      {/* Movements List - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Movimientos de {formatMonthKey(selectedMonth)}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={navigateToPreviousMonth}
                disabled={!hasPreviousMonth}
                title="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {formatMonthKey(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={navigateToNextMonth}
                disabled={!hasNextMonth}
                title="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {currentMonthMovements.length} {currentMonthMovements.length === 1 ? 'movimiento' : 'movimientos'}
          </p>
        </CardHeader>
        <CardContent>
          {entityMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay movimientos en esta entidad</p>
          ) : currentMonthMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay movimientos en {formatMonthKey(selectedMonth)}</p>
          ) : (
            <div className="space-y-2">
              {currentMonthMovements.map((movement) => {
                const Icon = movement.type === 'income' ? TrendingUp : TrendingDown;
                const hasHistory = movement.history && movement.history.length > 0;
                return (
                  <div key={movement.id} className="flex items-center justify-between p-3 rounded-lg border gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${movement.type === 'income' ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{movement.description}</p>
                        <p className="text-xs text-muted-foreground truncate">{movement.box} • {movement.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${movement.type === 'income' ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                          {movement.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(movement.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{parseLocalDate(movement.date).toLocaleDateString('es-CL')}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(movement)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {hasHistory && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setHistoryMovement(movement)}
                          >
                            <History className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(movement)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setEditingMovement(null);
          setFormData({
            type: 'income',
            amount: '',
            description: '',
            categoryValue: '',
            box: '',
            date: getTodayLocalDateString(),
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Movimiento</DialogTitle>
            <DialogDescription>
              Modifica los datos del movimiento
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value: MovementType) => handleEditTypeChange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">↗️ Ingreso</SelectItem>
                  <SelectItem value="expense">↙️ Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-amount">Monto</Label>
              <Input
                id="edit-amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Categoría</Label>
              <Select
                value={formData.categoryValue}
                onValueChange={(value) => setFormData({ ...formData, categoryValue: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCategories(formData.type).map((category) => (
                    <React.Fragment key={category.id}>
                      {/* Main Category */}
                      <SelectItem value={category.id}>
                        <span className="font-semibold">{category.name}</span>
                      </SelectItem>
                      {/* Subcategories */}
                      {category.subcategories && category.subcategories.map((sub) => (
                        <SelectItem
                          key={`${category.id}:${sub}`}
                          value={`${category.id}:${sub}`}
                          className="pl-6"
                        >
                          <span className="text-sm">↳ {sub}</span>
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-box">Caja *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableBoxes.map((box) => (
                  <Button
                    key={box}
                    type="button"
                    variant={formData.box === box ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, box })}
                    className="w-full"
                  >
                    {box}
                  </Button>
                ))}
              </div>
              {availableBoxes.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Esta entidad no tiene cajas disponibles
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-date">Fecha</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyMovement} onOpenChange={(open) => !open && setHistoryMovement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial de Cambios</DialogTitle>
            <DialogDescription>
              {historyMovement?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historyMovement?.history && historyMovement.history.length > 0 ? (
              historyMovement.history.map((entry, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{entry.field}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Anterior</p>
                      <p className="font-medium line-through text-muted-foreground">
                        {String(entry.oldValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nuevo</p>
                      <p className="font-medium text-green-600 dark:text-green-500">
                        {String(entry.newValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-6">
                No hay historial de cambios
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingMovement} onOpenChange={(open) => {
        if (!open) {
          setDeletingMovement(null);
          setDeleteConfirmation('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar el movimiento: {deletingMovement?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="confirm-delete">
                Escribe <span className="font-bold text-destructive">ELIMINAR</span> para confirmar
              </Label>
              <Input
                id="confirm-delete"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="ELIMINAR"
                className="mt-2"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeletingMovement(null);
                  setDeleteConfirmation('');
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmation !== 'ELIMINAR'}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Movement Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (!open) {
          setCreateFormData({
            type: 'income',
            amount: '',
            description: '',
            categoryValue: '',
            box: '',
            date: getTodayLocalDateString(),
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Movimiento</DialogTitle>
            <DialogDescription>
              Registra un ingreso o gasto para {entity?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="create-type">Tipo</Label>
              <Select value={createFormData.type} onValueChange={(value: MovementType) => handleTypeChange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">↗️ Ingreso</SelectItem>
                  <SelectItem value="expense">↙️ Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-amount">Monto</Label>
              <Input
                id="create-amount"
                type="number"
                value={createFormData.amount}
                onChange={(e) => setCreateFormData({ ...createFormData, amount: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="create-description">Descripción (opcional)</Label>
              <Input
                id="create-description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                placeholder="Ej: Sueldo mensual"
              />
            </div>
            <div>
              <Label htmlFor="create-category">Categoría</Label>
              <Select
                value={createFormData.categoryValue}
                onValueChange={(value) => setCreateFormData({ ...createFormData, categoryValue: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCategories(createFormData.type).map((category) => (
                    <React.Fragment key={category.id}>
                      {/* Main Category */}
                      <SelectItem value={category.id}>
                        <span className="font-semibold">{category.name}</span>
                      </SelectItem>
                      {/* Subcategories */}
                      {category.subcategories && category.subcategories.map((sub) => (
                        <SelectItem
                          key={`${category.id}:${sub}`}
                          value={`${category.id}:${sub}`}
                          className="pl-6"
                        >
                          <span className="text-sm">↳ {sub}</span>
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-box">Caja *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableBoxes.map((box) => (
                  <Button
                    key={box}
                    type="button"
                    variant={createFormData.box === box ? 'default' : 'outline'}
                    onClick={() => setCreateFormData({ ...createFormData, box })}
                    className="w-full"
                  >
                    {box}
                  </Button>
                ))}
              </div>
              {availableBoxes.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Esta entidad no tiene cajas disponibles
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="create-date">Fecha</Label>
              <Input
                id="create-date"
                type="date"
                value={createFormData.date}
                onChange={(e) => setCreateFormData({ ...createFormData, date: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
