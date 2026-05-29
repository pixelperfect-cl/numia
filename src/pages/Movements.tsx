/**
 * Numia v1.0 - Movements Page (Advanced Search & Audit)
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { formatCurrency, getTodayLocalDateString, parseLocalDate, getDateRangeFromType } from '@/lib/utils';
import type { Movement, MovementType, MovementHistoryEntry } from '@/types';
import { Plus, Search, Filter, Download, Trash2, Edit, FileSpreadsheet, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Check, X, Calendar as CalendarIcon, Upload, ChevronUp, ChevronDown, Clock, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addMonths, subMonths, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { CategorySelect } from '@/components/CategorySelect';
import { InteractiveCashFlowChart } from '@/components/InteractiveCashFlowChart';
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart';
import { MovementsAreaChart } from '@/components/MovementsAreaChart';
import { CategoryPieChart } from '@/components/CategoryPieChart';
import { MetricChartCard } from '@/components/dashboard/MetricChartCard';

interface MovementsProps {
  entityId?: string;
}

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortDirection = 'asc' | 'desc';

export function Movements({ entityId }: MovementsProps = {}) {
  const { movements, entities, categories, createMovement, updateMovement, deleteMovement, deleteMovementsBatch, loading, dateFilter } = useData();
  const { user } = useAuth();
  const { isBalanceHidden } = usePrivacy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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

  // --- Month Navigation Logic ---
  const { setDateFilter } = useData(); // Needed to update global filter

  const handleMonthChange = (direction: 'prev' | 'next') => {
    // Determine current center date from global filter or today
    let currentCenterDate = new Date();
    if (dateFilter.startDate) {
      // If filter exists, center on the start date
      currentCenterDate = parseLocalDate(dateFilter.startDate);
    }

    const newDate = direction === 'prev' ? subMonths(currentCenterDate, 1) : addMonths(currentCenterDate, 1);

    // Set to full month
    const start = startOfMonth(newDate);
    const end = endOfMonth(newDate);

    setDateFilter({
      type: 'CUSTOM',
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };

  const handleMonthSelect = (monthStr: string) => {
    // monthStr is yyyy-MM
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);

    const start = startOfMonth(date);
    const end = endOfMonth(date);

    setDateFilter({
      type: 'CUSTOM',
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };

  // Generate last 24 months for dropdown
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 24; i++) {
      const date = subMonths(today, i);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: es });
      options.push({ value, label });
    }
    return options;
  }, []);

  const currentMonthValue = useMemo(() => {
    if (dateFilter.type === 'CUSTOM' && dateFilter.startDate) {
      const date = parseLocalDate(dateFilter.startDate);
      return format(date, 'yyyy-MM');
    }
    return format(new Date(), 'yyyy-MM');
  }, [dateFilter]);

  const currentMonthLabel = useMemo(() => {
    if (dateFilter.type === 'CUSTOM' && dateFilter.startDate) {
      const date = parseLocalDate(dateFilter.startDate);
      return format(date, 'MMMM yyyy', { locale: es });
    }
    // Fallback logic
    const range = getDateRangeFromType(dateFilter.type, dateFilter.startDate, dateFilter.endDate);
    if (range.startDate) {
      return format(range.startDate, 'MMMM yyyy', { locale: es });
    }
    return 'Todos los movimientos';
  }, [dateFilter]);

  // Pagination state removed
  // const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage, setItemsPerPage] = useState(20);

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
      // Date filter
      const { startDate, endDate } = getDateRangeFromType(dateFilter.type, dateFilter.startDate, dateFilter.endDate);
      const movementDate = parseLocalDate(movement.date);
      if (movementDate < startDate || movementDate > endDate) {
        return false;
      }

      // Search text filter
      const searchLower = searchText.toLowerCase();
      const matchesSearch =
        movement.description.toLowerCase().includes(searchLower) ||
        (movement.category || '').toLowerCase().includes(searchLower) ||
        (movement.subcategory || '').toLowerCase().includes(searchLower) ||
        movement.box.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Entity filter
      if (filterEntity !== 'all' && movement.entityId !== filterEntity) return false;

      // Type filter
      if (filterType !== 'all' && movement.type !== filterType) return false;

      // Category filter
      if (filterCategory !== 'all' && movement.categoryId !== filterCategory) return false;

      // Box filter
      if (filterBox !== 'all' && movement.box !== filterBox) return false;

      // Filter out non-financial movements (e.g. project history only)
      if (movement.isFinancial === false) return false;

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
  }, [movements, searchText, filterEntity, filterType, filterCategory, filterBox, sortField, sortDirection, dateFilter]);

  // Movements for Chart (IGNORES Date Filter, but keeps others)
  const movementsForChart = useMemo(() => {
    return movements.filter((movement) => {
      // Search text filter
      const searchLower = searchText.toLowerCase();
      const matchesSearch =
        movement.description.toLowerCase().includes(searchLower) ||
        (movement.category || '').toLowerCase().includes(searchLower) ||
        (movement.subcategory || '').toLowerCase().includes(searchLower) ||
        movement.box.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Entity filter
      if (filterEntity !== 'all' && movement.entityId !== filterEntity) return false;

      // Type filter
      if (filterType !== 'all' && movement.type !== filterType) return false;

      // Category filter
      if (filterCategory !== 'all' && movement.categoryId !== filterCategory) return false;

      // Box filter
      if (filterBox !== 'all' && movement.box !== filterBox) return false;

      // Filter out non-financial movements
      if (movement.isFinancial === false) return false;

      return true;
    });
  }, [movements, searchText, filterEntity, filterType, filterCategory, filterBox]);

  // Group filtered movements by month
  const groupedMovements = useMemo(() => {
    const groups: Record<string, Movement[]> = {};

    // Sort all filtered movements by date descending
    const sorted = [...filteredMovements].sort((a, b) => {
      return parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime();
    });

    sorted.forEach(movement => {
      const date = parseLocalDate(movement.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(movement);
    });

    return groups;
  }, [filteredMovements]);

  // Statistics (Filtered)
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

  // Saldo Real por caja (all-time, por entidad, solo financieros).
  // Ignora a propósito los filtros de fecha/tipo/categoría/búsqueda/caja:
  // representa el dinero real que queda HOY en cada caja, no un balance relativo.
  const realBalances = useMemo(() => {
    // Entidad activa (si hay una seleccionada) para ordenar/etiquetar cajas con su config
    const activeEntity = filterEntity !== 'all'
      ? entities.find(e => e.id === filterEntity)
      : undefined;

    // Caja por defecto de la entidad: a ella van los movimientos sin caja asignada
    // (mejor que el viejo fallback hardcodeado 'Efectivo', que ni existe en la entidad).
    const defaultBoxName = activeEntity?.boxes
      ? (Object.entries(activeEntity.boxes).find(([, b]) => b.isDefault)?.[0]
          ?? Object.keys(activeEntity.boxes)[0])
      : undefined;

    const entityMovements = movements.filter(m =>
      m.isFinancial !== false &&
      (filterEntity === 'all' || m.entityId === filterEntity)
    );

    // Agrupamos por caja efectiva (box real, o la default de la entidad si viene vacío)
    const byBox: Record<string, number> = {};
    for (const m of entityMovements) {
      const key = (m.box && m.box.trim()) || defaultBoxName || 'Sin caja';
      const amount = Math.abs(m.amount);
      const signed = m.type === 'income' ? amount : m.type === 'expense' ? -amount : 0;
      byBox[key] = (byBox[key] ?? 0) + signed;
    }
    const total = Object.values(byBox).reduce((sum, v) => sum + v, 0);

    // Cajas definidas en la entidad (ordenadas) + cajas presentes en movimientos sin definir
    const definedBoxes = activeEntity?.boxes
      ? Object.entries(activeEntity.boxes)
          .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
          .map(([name, data]) => ({ name, currency: data.currency || 'CLP' }))
      : [];
    const definedNames = new Set(definedBoxes.map(b => b.name));
    const extraBoxes = Object.keys(byBox)
      .filter(name => !definedNames.has(name))
      .map(name => ({ name, currency: 'CLP' }));

    const boxes = [...definedBoxes, ...extraBoxes].map(b => ({
      ...b,
      balance: byBox[b.name] ?? 0,
    }));

    return { total, boxes };
  }, [movements, filterEntity, entities]);

  // Sparkline data for stat cards (reactive to date range)
  const { incomeHistory, expensesHistory, balanceHistory, incomeTrend, expensesTrend, movementsCountHistory, movementsTrend } = useMemo(() => {
    const { startDate: rangeStart, endDate: rangeEnd } = getDateRangeFromType(dateFilter.type, dateFilter.startDate, dateFilter.endDate);

    // Calculate the number of days in the selected range
    const rangeDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Previous period of equal length (for trend calculation)
    const prevEnd = new Date(rangeStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - rangeDays + 1);

    let currentIncome = 0, prevIncome = 0, currentExp = 0, prevExp = 0;
    let currentCount = 0, prevCount = 0;
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    const countMap = new Map<string, number>();

    // Process ALL movements to get both current and previous period data
    movements.forEach(m => {
      if (m.isFinancial === false) return;
      const mDate = parseLocalDate(m.date);
      const dayStr = format(mDate, 'yyyy-MM-dd');
      const amount = Math.abs(m.amount);

      // Current period
      if (mDate >= rangeStart && mDate <= rangeEnd) {
        countMap.set(dayStr, (countMap.get(dayStr) || 0) + 1);
        currentCount++;
        if (m.type === 'income') {
          incomeMap.set(dayStr, (incomeMap.get(dayStr) || 0) + amount);
          currentIncome += amount;
        } else {
          expenseMap.set(dayStr, (expenseMap.get(dayStr) || 0) + amount);
          currentExp += amount;
        }
      }
      // Previous period (for trends)
      else if (mDate >= prevStart && mDate <= prevEnd) {
        prevCount++;
        if (m.type === 'income') prevIncome += amount;
        else prevExp += amount;
      }
    });

    // Build daily history arrays within the selected range
    // Cap data points at ~60 for readability; if range is larger, group by larger intervals
    const maxPoints = 60;
    const step = Math.max(1, Math.floor(rangeDays / maxPoints));
    const incHistory: { value: number }[] = [];
    const expHistory: { value: number }[] = [];
    const balHistory: { balance: number }[] = [];
    const cntHistory: { value: number }[] = [];
    let runningBal = 0;

    for (let i = 0; i < rangeDays; i += step) {
      let incVal = 0, expVal = 0, cntVal = 0;
      // Aggregate over 'step' days
      for (let j = 0; j < step && (i + j) < rangeDays; j++) {
        const date = new Date(rangeStart);
        date.setDate(date.getDate() + i + j);
        const dateStr = format(date, 'yyyy-MM-dd');
        incVal += incomeMap.get(dateStr) || 0;
        expVal += expenseMap.get(dateStr) || 0;
        cntVal += countMap.get(dateStr) || 0;
      }
      runningBal += incVal - expVal;
      incHistory.push({ value: incVal });
      expHistory.push({ value: expVal });
      balHistory.push({ balance: runningBal });
      cntHistory.push({ value: cntVal });
    }

    const iTrend = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : (currentIncome > 0 ? 100 : 0);
    const eTrend = prevExp > 0 ? ((currentExp - prevExp) / prevExp) * 100 : (currentExp > 0 ? 100 : 0);
    const mTrend = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : (currentCount > 0 ? 100 : 0);

    return {
      incomeHistory: incHistory,
      expensesHistory: expHistory,
      balanceHistory: balHistory,
      incomeTrend: iTrend,
      expensesTrend: eTrend,
      movementsCountHistory: cntHistory,
      movementsTrend: mTrend
    };
  }, [movements, dateFilter]);

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

  const handleSelectAll = (movementsToSelect: Movement[]) => {
    const allSelected = movementsToSelect.every(m => selectedMovements.has(m.id));

    if (allSelected) {
      // Deselect all
      const newSelected = new Set(selectedMovements);
      movementsToSelect.forEach(m => newSelected.delete(m.id));
      setSelectedMovements(newSelected);
    } else {
      // Select all
      const newSelected = new Set(selectedMovements);
      movementsToSelect.forEach(m => newSelected.add(m.id));
      setSelectedMovements(newSelected);
    }
    setLastSelectedId(null);
  };

  // Helper to checking if a group is fully selected
  const isGroupSelected = (groupMovements: Movement[]) => {
    return groupMovements.length > 0 && groupMovements.every(m => selectedMovements.has(m.id));
  };


  const handleSelectMovement = (id: string, shiftKey: boolean = false, visibleMovements: Movement[] = []) => {
    const newSelected = new Set(selectedMovements);

    if (shiftKey && lastSelectedId && visibleMovements.length > 0) {
      // Find dynamic index in the flat list of what's currently visible
      const lastIndex = visibleMovements.findIndex(m => m.id === lastSelectedId);
      const currentIndex = visibleMovements.findIndex(m => m.id === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = visibleMovements.slice(start, end + 1);

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
      // Borrado en lote: un solo DELETE ... IN (...) por chunk en vez de N round-trips
      await deleteMovementsBatch(movementIds);

      // Clear selection
      setSelectedMovements(new Set());

      alert(`✓ ${movementIds.length} movimiento${movementIds.length > 1 ? 's eliminados' : ' eliminado'} correctamente`);
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
          <Button variant="outline" className="px-2 md:px-4" onClick={() => navigate('/mass-upload')}>
            <Upload className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Carga Masiva</span>
          </Button>

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

      {/* Statistics Cards - Dashboard Style with Sparklines */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="col-span-1 h-32">
          <MetricChartCard
            label="Total Movimientos"
            value={`${stats.count}`}
            subtext={`${filteredMovements.filter(m => m.type === 'income').length} ingresos · ${filteredMovements.filter(m => m.type === 'expense').length} gastos`}
            data={movementsCountHistory}
            color="blue"
            trend={parseFloat(movementsTrend.toFixed(1))}
            trendDirection={movementsTrend >= 0 ? 'up' : 'down'}
          />
        </div>
        <div className="col-span-1 h-32">
          <MetricChartCard
            label="Ingresos"
            value={isBalanceHidden ? '****' : formatCurrency(stats.income)}
            data={incomeHistory}
            color="emerald"
            trend={parseFloat(incomeTrend.toFixed(1))}
            trendDirection={incomeTrend >= 0 ? 'up' : 'down'}
          />
        </div>
        <div className="col-span-1 h-32">
          <MetricChartCard
            label="Gastos"
            value={isBalanceHidden ? '****' : formatCurrency(stats.expense)}
            data={expensesHistory}
            color="rose"
            trend={parseFloat(expensesTrend.toFixed(1))}
            trendDirection={expensesTrend > 0 ? 'up' : 'down'}
          />
        </div>
        {/* Saldo Real: dinero actual total + desglose por caja (all-time, no relativo al filtro) */}
        <div className="col-span-1 h-32">
          <div className={cn(
            "flex h-full flex-col justify-between rounded-xl border p-4 backdrop-blur-sm transition-all",
            realBalances.total < 0
              ? "border-red-500/30 bg-red-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          )}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Saldo Real</span>
              <span className="text-[9px] text-muted-foreground">dinero actual</span>
            </div>
            <div className={cn(
              "text-2xl font-light tracking-tight",
              realBalances.total < 0 ? "text-red-400" : "text-emerald-400"
            )}>
              {isBalanceHidden ? '****' : formatCurrency(realBalances.total)}
            </div>
            {/* Desglose por caja en chico */}
            <div className="space-y-0.5 overflow-hidden">
              {realBalances.boxes.map(box => (
                <div key={box.name} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                    <Wallet className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate" title={box.name}>{box.name}</span>
                  </span>
                  <span className={cn(
                    "shrink-0 font-medium tabular-nums",
                    box.balance < 0 ? "text-red-400" : "text-foreground/80"
                  )}>
                    {isBalanceHidden ? '****' : formatCurrency(box.balance, box.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Resumen Visual</h2>

        {/* Interactive Cash Flow Chart */}
        <InteractiveCashFlowChart movements={movementsForChart} />

        {/* Income/Expense Chart */}
        <IncomeExpenseChart movements={movementsForChart} />

        {/* Movements Activity Chart */}
        <MovementsAreaChart movements={movementsForChart} />

        {/* Category Distribution Charts */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <CategoryPieChart movements={movementsForChart} categories={categories} type="income" />
          <CategoryPieChart movements={movementsForChart} categories={categories} type="expense" />
        </div>

      </div>

      {/* Filters */}
      <Card className="!bg-card/40 backdrop-blur-sm !border-white/10 overflow-hidden transition-all duration-300 hover:border-white/20">
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
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="capitalize">
                  {currentMonthLabel}
                </CardTitle>
                <Badge variant="outline" className="ml-2">
                  0 movimientos
                </Badge>
              </div>

              {/* Month Navigator - Always visible */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select value={currentMonthValue} onValueChange={handleMonthSelect}>
                  <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 w-[180px] text-center font-medium capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(option => (
                      <SelectItem key={option.value} value={option.value} className="capitalize">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-lg font-semibold mb-2">No hay movimientos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {movements.length === 0 ? 'Registra tu primer ingreso o gasto' : 'No se encontraron movimientos en este período. Usa las flechas ← → para navegar entre meses.'}
            </p>
            {movements.length === 0 ? (
              <Button onClick={() => setIsOpen(true)} disabled={entities.length === 0}>
                {entities.length === 0 ? 'Crea una entidad primero' : '+ Nuevo Movimiento'}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => handleMonthChange('prev')}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Ir al mes anterior
              </Button>
            )}
          </CardContent>
        </Card>















      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="capitalize">
                  {currentMonthLabel}
                </CardTitle>
                <Badge variant="outline" className="ml-2">
                  {filteredMovements.length} movimientos
                </Badge>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select value={currentMonthValue} onValueChange={handleMonthSelect}>
                  <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 w-[180px] text-center font-medium capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(option => (
                      <SelectItem key={option.value} value={option.value} className="capitalize">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {selectedMovements.size > 0 && (
                <div className="flex items-center gap-2 ml-auto">
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
            <div className="space-y-4">
              {/* Table Header (Desktop) */}
              <div className="hidden md:flex items-center gap-2 pb-2 border-b text-sm font-medium text-muted-foreground">
                <div className="w-8">
                  <Checkbox
                    checked={selectedMovements.size === filteredMovements.length && filteredMovements.length > 0}
                    onCheckedChange={() => handleSelectAll(filteredMovements)}
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

              {/* Grouped Movements */}
              {Object.entries(groupedMovements).map(([monthKey, groupMovements]) => (
                <div key={monthKey} className="space-y-2">
                  <div className="flex items-center gap-2 py-2 bg-muted/20 px-3 rounded-md">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold capitalize text-foreground/80">
                      {format(parseLocalDate(groupMovements[0].date), 'MMMM yyyy', { locale: es })}
                    </h3>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto md:ml-2">
                      {groupMovements.length}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {groupMovements.map((movement) => {
                      const entity = entities.find(e => e.id === movement.entityId);
                      const hasHistory = movement.history && movement.history.length > 0;
                      const isEdited = hasHistory;

                      return (
                        <div key={movement.id} className="flex items-start gap-2 p-3 rounded-lg hover:bg-muted/50 border text-sm md:items-center md:p-2 ml-0 md:ml-2">
                          {/* Checkbox */}
                          <div className="w-8 flex-shrink-0 pt-0.5 md:pt-0">
                            <Checkbox
                              checked={selectedMovements.has(movement.id)}
                              onCheckedChange={() => { }}
                              onClick={(e) => handleSelectMovement(movement.id, e.shiftKey, filteredMovements)}
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
                                {/* Mobile Date */}
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
                              {parseLocalDate(movement.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                </div>
              ))}
            </div>
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
