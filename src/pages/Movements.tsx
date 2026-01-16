/**
 * Numia v1.0 - Movements Page (Advanced Search & Audit)
 */

import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getTodayLocalDateString, parseLocalDate } from '@/lib/utils';
import type { Movement, MovementType, MovementHistoryEntry } from '@/types';
import { Plus, Search, Filter, Download, Trash2, Edit, FileSpreadsheet, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Check, X, Calendar as CalendarIcon, Upload, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BulkUploadWizard } from '@/components/movements/BulkUploadWizard';
import { CategorySelect } from '@/components/CategorySelect';
import { InteractiveCashFlowChart } from '@/components/InteractiveCashFlowChart';

interface MovementsProps {
  entityId?: string;
}

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortDirection = 'asc' | 'desc';

export function Movements({ entityId }: MovementsProps = {}) {
  const { movements, entities, categories, createMovement, updateMovement, deleteMovement, loading } = useData();
  const { user } = useAuth();
  const { isBalanceHidden } = usePrivacy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Handle URL action params
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setIsOpen(true);
      // Optional: clear param after opening, or keep it to allow sharing "create link"
      // setSearchParams(prev => { 
      //    const newParams = new URLSearchParams(prev);
      //    newParams.delete('action');
      //    return newParams;
      // });
    }
  }, [searchParams]);

  // Update URL when dialog closes (optional, but cleaner if we want to remove ?action=create)
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Remove action param if present
      if (searchParams.get('action') === 'create') {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('action');
          return newParams;
        });
      }
      setEditingMovement(null);
      setFormData({
        type: 'income',
        amount: '',
        description: '',
        categoryValue: '',
        box: '',
        entityId: entityId || '', // Ensure entityId is reset
        date: getTodayLocalDateString(),
      });
    }
  };

  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [historyMovement, setHistoryMovement] = useState<Movement | null>(null);
  const [formData, setFormData] = useState({
    type: 'income' as MovementType,
    amount: '',
    description: '',
    categoryValue: '', // Format: "categoryId" or "categoryId:subcategory"
    box: '',
    entityId: entityId || '',
    date: getTodayLocalDateString(),
  });

  // Filters state
  const [searchText, setSearchText] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>(entityId || 'all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBox, setFilterBox] = useState<string>('all');

  // Update effect for entityId changes
  useEffect(() => {
    if (entityId) {
      setFilterEntity(entityId);
      setFormData(prev => ({ ...prev, entityId }));
    } else {
      setFilterEntity('all');
    }
  }, [entityId]);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Selection state
  const [selectedMovements, setSelectedMovements] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleEdit = (movement: Movement) => {
    setEditingMovement(movement);
    const categoryValue = movement.subcategory
      ? `${movement.categoryId}:${movement.subcategory}`
      : movement.categoryId || movement.category || '';

    setFormData({
      type: movement.type,
      amount: movement.amount.toString(),
      description: movement.description,
      categoryValue,
      box: movement.box,
      entityId: movement.entityId,
      date: movement.date,
    });
    setIsOpen(true);
  };

  const handleDelete = async (movementId: string, movementDescription: string) => {
    const confirmation = prompt(
      `⚠️ ATENCIÓN: Estás a punto de eliminar el movimiento "${movementDescription}".\n\n` +
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
      await deleteMovement(movementId);
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Error al eliminar movimiento');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityId) {
      alert('Selecciona una entidad');
      return;
    }
    if (!formData.categoryValue) {
      alert('Selecciona una categoría');
      return;
    }
    if (!formData.box) {
      alert('Selecciona una caja');
      return;
    }

    const [categoryId, subcategory] = formData.categoryValue.includes(':')
      ? formData.categoryValue.split(':')
      : [formData.categoryValue, undefined];

    try {
      if (editingMovement && user) {
        const changes: MovementHistoryEntry[] = [];
        const currentCategoryValue = editingMovement.subcategory
          ? `${editingMovement.categoryId}:${editingMovement.subcategory}`
          : editingMovement.categoryId;

        if (currentCategoryValue !== formData.categoryValue) {
          changes.push({
            timestamp: new Date(),
            field: 'category',
            oldValue: currentCategoryValue,
            newValue: formData.categoryValue,
            userId: user.uid,
          });
        }

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

        await updateMovement(editingMovement.id, {
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          categoryId,
          ...(subcategory ? { subcategory } : {}),
          box: formData.box,
          entityId: formData.entityId,
          date: formData.date,
          history,
        });
      } else {
        await createMovement({
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          categoryId,
          ...(subcategory ? { subcategory } : {}),
          box: formData.box,
          entityId: formData.entityId,
          date: formData.date,
        });
      }

      handleOpenChange(false);
      setEditingMovement(null);
      setFormData({
        type: 'income',
        amount: '',
        description: '',
        categoryValue: '',
        box: '',
        entityId: '',
        date: getTodayLocalDateString(),
      });
    } catch (error) {
      console.error('Error saving movement:', error);
      alert('Error al guardar movimiento');
    }
  };

  // Filtered and sorted movements
  const filteredMovements = useMemo(() => {
    let result = movements.filter((movement) => {
      // Search text filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesSearch =
          movement.description.toLowerCase().includes(searchLower) ||
          movement.category?.toLowerCase().includes(searchLower) ||
          movement.subcategory?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Entity filter
      if (filterEntity !== 'all' && movement.entityId !== filterEntity) return false;

      // Type filter
      if (filterType !== 'all' && movement.type !== filterType) return false;

      // Category filter
      if (filterCategory !== 'all' && movement.categoryId !== filterCategory) return false;

      // Box filter
      if (filterBox !== 'all' && movement.box !== filterBox) return false;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [movements, searchText, filterEntity, filterType, filterCategory, filterBox, sortField, sortDirection]);

  // Pagination
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredMovements.slice(start, end);
  }, [filteredMovements, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const totalIncome = filteredMovements
      .filter(m => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalExpense = filteredMovements
      .filter(m => m.type === 'expense')
      .reduce((sum, m) => sum + Math.abs(m.amount), 0);

    return {
      count: filteredMovements.length,
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [filteredMovements]);

  // Get boxes from selected entity
  const selectedEntity = entities.find(e => e.id === formData.entityId);
  const availableBoxes = selectedEntity ? Object.keys(selectedEntity.boxes || { 'Efectivo': {} }) : ['Efectivo'];

  // Get all unique boxes for filter
  const allBoxes = useMemo(() => {
    const boxes = new Set<string>();
    movements.forEach(m => boxes.add(m.box));
    return Array.from(boxes).sort();
  }, [movements]);

  // Get categories based on movement type
  const getAvailableCategories = (type: MovementType) => {
    return categories.filter(c => c.type === type);
  };

  // Handle type change - reset category when type changes
  const handleTypeChange = (newType: MovementType) => {
    setFormData({ ...formData, type: newType, categoryValue: '' });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const handleSelectAll = () => {
    if (selectedMovements.size === paginatedMovements.length) {
      setSelectedMovements(new Set());
      setLastSelectedId(null);
    } else {
      setSelectedMovements(new Set(paginatedMovements.map(m => m.id)));
      setLastSelectedId(null);
    }
  };

  const handleSelectMovement = (id: string, shiftKey: boolean = false) => {
    const newSelected = new Set(selectedMovements);

    if (shiftKey && lastSelectedId) {
      const lastIndex = paginatedMovements.findIndex(m => m.id === lastSelectedId);
      const currentIndex = paginatedMovements.findIndex(m => m.id === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = paginatedMovements.slice(start, end + 1);

        range.forEach(m => newSelected.add(m.id));
      }
    } else {
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setLastSelectedId(id);
    }

    setSelectedMovements(newSelected);
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Entidad', 'Caja', 'Monto'].join(','),
      ...filteredMovements.map(m => {
        const entity = entities.find(e => e.id === m.entityId);
        return [
          parseLocalDate(m.date).toLocaleDateString('es-CL'),
          m.type === 'income' ? 'Ingreso' : 'Gasto',
          `"${m.description}"`,
          `"${m.category || ''}"`,
          `"${entity?.name || ''}"`,
          m.box,
          m.amount
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleBatchDelete = async () => {
    const count = selectedMovements.size;
    const confirmation = prompt(
      `⚠️ ATENCIÓN: Estás a punto de eliminar ${count} movimiento${count > 1 ? 's' : ''}.\n\n` +
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
      const movementIds = Array.from(selectedMovements);
      let successCount = 0;
      let failCount = 0;

      for (const movementId of movementIds) {
        try {
          await deleteMovement(movementId);
          successCount++;
        } catch (error) {
          console.error(`Error deleting movement ${movementId}:`, error);
          failCount++;
        }
      }

      // Clear selection
      setSelectedMovements(new Set());

      // Show result
      if (failCount === 0) {
        alert(`✓ ${successCount} movimiento${successCount > 1 ? 's eliminados' : ' eliminado'} correctamente`);
      } else {
        alert(
          `Eliminación parcial:\n` +
          `✓ ${successCount} eliminados\n` +
          `✗ ${failCount} fallaron`
        );
      }
    } catch (error) {
      console.error('Error in batch delete:', error);
      alert('Error al eliminar movimientos');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground">Búsqueda avanzada y auditoría</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="px-2 md:px-4">
                <Upload className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Carga Masiva</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Carga Masiva de Movimientos</DialogTitle>
                <DialogDescription>
                  Importa movimientos desde cartolas bancarias (BCI - Histórica o Detallada)
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto p-1">
                <BulkUploadWizard
                  onClose={() => setIsBulkUploadOpen(false)}
                  onSaveSuccess={() => {
                    setIsBulkUploadOpen(false);
                    alert('Movimientos importados correctamente');
                  }}
                  initialEntityId={entityId}
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="icon" className="md:w-auto md:px-4 md:py-2">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Nuevo Movimiento</span>
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMovement ? 'Editar Movimiento' : 'Crear Nuevo Movimiento'}</DialogTitle>
                <DialogDescription>
                  {editingMovement ? 'Modifica los datos del movimiento' : 'Registra un ingreso o gasto asociado a una entidad y caja específica'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!entityId && (
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
                )}
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(value: MovementType) => handleTypeChange(value)}>
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
                <div>
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ej: Sueldo mensual"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <CategorySelect
                    value={formData.categoryValue}
                    onValueChange={(value) => setFormData({ ...formData, categoryValue: value })}
                    categories={categories}
                    type={formData.type}
                  />
                </div>
                <div>
                  <Label htmlFor="box">Caja *</Label>
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
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingMovement ? 'Guardar' : 'Crear'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
              {isBalanceHidden ? '****' : formatCurrency(stats.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">
              {isBalanceHidden ? '****' : formatCurrency(stats.expense)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
              {isBalanceHidden ? '****' : formatCurrency(stats.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Cash Flow Chart */}
      <InteractiveCashFlowChart movements={filteredMovements} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtros y Búsqueda</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Descripción, categoría..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              {!entityId && (
                <div>
                  <Label htmlFor="filter-entity">Entidad</Label>
                  <Select value={filterEntity} onValueChange={setFilterEntity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="filter-type">Tipo</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="income">Ingresos</SelectItem>
                    <SelectItem value="expense">Gastos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-category">Categoría</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-box">Caja</Label>
                <Select value={filterBox} onValueChange={setFilterBox}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {allBoxes.map((box) => (
                      <SelectItem key={box} value={box}>
                        {box}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchText('');
                  setFilterEntity('all');
                  setFilterType('all');
                  setFilterCategory('all');
                  setFilterBox('all');
                }}
              >
                Limpiar Filtros
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {loading ? (
        <div>Cargando...</div>
      ) : filteredMovements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-lg font-semibold mb-2">No hay movimientos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {movements.length === 0 ? 'Registra tu primer ingreso o gasto' : 'No se encontraron resultados con los filtros aplicados'}
            </p>
            {movements.length === 0 && (
              <Button onClick={() => setIsOpen(true)} disabled={entities.length === 0}>
                {entities.length === 0 ? 'Crea una entidad primero' : '+ Nuevo Movimiento'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historial ({filteredMovements.length} movimientos)</CardTitle>
              {selectedMovements.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedMovements.size} seleccionados</Badge>
                  <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar seleccionados
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden md:flex items-center gap-2 pb-2 border-b text-sm font-medium text-muted-foreground">
                <div className="w-8">
                  <Checkbox
                    checked={selectedMovements.size === paginatedMovements.length && paginatedMovements.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </div>
                <div className="flex-1 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('date')}>
                  <span>Fecha</span>
                  <SortIcon field="date" />
                </div>
                <div className="w-12">Tipo</div>
                <div className="flex-[2] flex items-center gap-1 cursor-pointer" onClick={() => handleSort('description')}>
                  <span>Descripción</span>
                  <SortIcon field="description" />
                </div>
                <div className="flex-1 flex items-center gap-1 cursor-pointer" onClick={() => handleSort('category')}>
                  <span>Categoría</span>
                  <SortIcon field="category" />
                </div>
                <div className="flex-1">Entidad</div>
                <div className="w-24 text-right flex items-center gap-1 cursor-pointer justify-end" onClick={() => handleSort('amount')}>
                  <span>Monto</span>
                  <SortIcon field="amount" />
                </div>
                <div className="w-32">Acciones</div>
              </div>

              {/* Table Rows */}
              {paginatedMovements.map((movement) => {
                const entity = entities.find(e => e.id === movement.entityId);
                const hasHistory = movement.history && movement.history.length > 0;
                const isEdited = hasHistory;

                return (
                  <div key={movement.id} className="flex items-start gap-2 p-3 rounded-lg hover:bg-muted/50 border text-sm md:items-center md:p-2">
                    {/* Checkbox */}
                    <div className="w-8 flex-shrink-0 pt-0.5 md:pt-0">
                      <Checkbox
                        checked={selectedMovements.has(movement.id)}
                        onCheckedChange={() => { }}
                        onClick={(e) => handleSelectMovement(movement.id, e.shiftKey)}
                      />
                    </div>

                    {/* Mobile Layout - Card Style */}
                    <div className="flex-1 min-w-0 md:hidden">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg flex-shrink-0">{movement.type === 'income' ? '↗️' : '↙️'}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{movement.description || 'Sin descripción'}</span>
                              {isEdited && <Badge variant="outline" className="text-xs flex-shrink-0">Editado</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{entity?.name}</div>
                          </div>
                        </div>
                        <div className={`font-bold whitespace-nowrap flex-shrink-0 ${movement.type === 'income' ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                          {isBalanceHidden ? '****' : `${movement.type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(movement.amount))}`}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{parseLocalDate(movement.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</span>
                          <span>•</span>
                          <span className="truncate">{movement.box}</span>
                          {movement.category && (
                            <>
                              <span>•</span>
                              <span className="truncate">{movement.category}</span>
                            </>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(movement)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {hasHistory && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setHistoryMovement(movement)}
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(movement.id, movement.description || 'Sin descripción')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout - Table Style */}
                    <div className="hidden md:contents">
                      <div className="flex-1">
                        {parseLocalDate(movement.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="w-12">
                        <span className="text-xl">{movement.type === 'income' ? '↗️' : '↙️'}</span>
                      </div>
                      <div className="flex-[2] min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{movement.description || 'Sin descripción'}</span>
                          {isEdited && <Badge variant="outline" className="text-xs flex-shrink-0">Editado</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{movement.box}</div>
                      </div>
                      <div className="flex-1 text-xs truncate">{movement.category}</div>
                      <div className="flex-1 text-xs truncate">{entity?.name}</div>
                      <div className={`w-24 text-right font-bold whitespace-nowrap ${movement.type === 'income' ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                        {isBalanceHidden ? '****' : `${movement.type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(movement.amount))}`}
                      </div>
                      <div className="w-32 flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(movement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {hasHistory && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setHistoryMovement(movement)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(movement.id, movement.description || 'Sin descripción')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label htmlFor="items-per-page" className="text-sm">Mostrar:</Label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
