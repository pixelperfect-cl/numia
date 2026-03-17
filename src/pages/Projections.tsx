/**
 * Numia v1.0 - Cash Flow / Projections Page
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, getTodayLocalDateString } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { IconComponent } from '@/components/IconPicker';
import type { MovementType, Subscription } from '@/types';
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2, CheckCircle, RefreshCcw, Briefcase, Wallet } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getClients, getSubscriptions as getClientSubscriptions } from '@/lib/supabase/database';
import { fetchIndicators } from '@/lib/indicators';

interface ProjectionsProps {
  entityId?: string;
}

export function Projections({ entityId }: ProjectionsProps = {}) {
  const { entities, categories, projections, createProjection, updateProjection, deleteProjection, createMovement, entitySubscriptions, loading: contextLoading } = useData();
  const { isBalanceHidden } = usePrivacy();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProjection, setEditingProjection] = useState<any>(null);
  const [itemType, setItemType] = useState<MovementType>('income');

  // ERP Data State
  const [erpIncome, setErpIncome] = useState(0);
  const [erpSubscriptions, setErpSubscriptions] = useState<Subscription[]>([]);
  const [loadingErp, setLoadingErp] = useState(true);
  const [ufValue, setUfValue] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    entityId: entityId || '',
    categoryId: '',
    description: '',
    amount: '',
  });

  // Fetch ERP Data (Income from Services)
  useEffect(() => {
    const fetchErpData = async () => {
      if (!user) return;
      try {
        setLoadingErp(true);
        // Fetch UF Value first
        let currentUf = ufValue;
        if (!currentUf) {
          try {
            const indicators = await fetchIndicators();
            if (indicators.uf && indicators.uf.valor) {
              currentUf = indicators.uf.valor;
              setUfValue(currentUf);
            }
          } catch (err) {
            console.error("Error fetching indicators:", err);
          }
        }

        const clients = await getClients(user.uid);
        let totalMonthlyIncome = 0;
        let allSubs: Subscription[] = [];

        await Promise.all(clients.map(async (client) => {
          if (client.status !== 'active') return;
          const subs = await getClientSubscriptions(client.id, user.uid);

          subs.forEach(sub => {
            if (sub.status === 'active') {
              allSubs.push(sub);
            }
          });
        }));

        // Deduplicate subscriptions by ID
        const uniqueSubsMap = new Map<string, Subscription>();
        allSubs.forEach(sub => uniqueSubsMap.set(sub.id, sub));
        const uniqueSubs = Array.from(uniqueSubsMap.values());

        // Calculate total income from unique subscriptions
        uniqueSubs.forEach(sub => {
          let amount = Number(sub.amount) || 0;
          if (sub.currency === 'UF' && currentUf) {
            amount = amount * currentUf;
          }

          if (sub.frequency === 'yearly') {
            amount = amount / 12;
          }
          totalMonthlyIncome += amount;
        });

        setErpIncome(totalMonthlyIncome);
        setErpSubscriptions(uniqueSubs);
      } catch (error) {
        console.error("Error fetching ERP data for projections:", error);
      } finally {
        setLoadingErp(false);
      }
    };

    fetchErpData();
  }, [user]); // Removed ufValue dependency to avoid loop if we set it inside


  // Handle URL params
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setItemType('income'); // Default to income
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      if (searchParams.get('action') === 'create') {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('action');
          return newParams;
        });
      }
    }
  };

  // Update formData when entityId changes
  useEffect(() => {
    if (entityId) {
      setFormData(prev => ({ ...prev, entityId }));
    }
  }, [entityId]);

  // Filter projections by entity
  const filteredProjections = entityId
    ? projections.filter(p => p.entityId === entityId)
    : projections;

  // Filter Entity Subscriptions (Expenses)
  const filteredEntitySubscriptions = entityId
    ? entitySubscriptions.filter(s => s.entityId === entityId && s.status === 'active')
    : entitySubscriptions.filter(s => s.status === 'active');

  // Calculate Totals

  // 1. Manual Projections
  const manualIncome = (filteredProjections || []).reduce((sum, p) => sum + p.totals.totalIncome, 0);
  const manualExpenses = (filteredProjections || []).reduce((sum, p) => sum + p.totals.totalExpenses, 0);

  // 2. Automated Expenses (Gastos)
  const automatedExpenses = filteredEntitySubscriptions.reduce((sum, sub) => {
    let amount = Number(sub.amount) || 0;
    if (sub.billingCycle === 'yearly') amount = amount / 12;
    return sum + amount;
  }, 0);

  // 3. Automated Income (ERP)
  // Note: ERP income is global for the user, usually tied to the Business entity.
  // If we are viewing a specific entity, we might only want to show it if it's the business entity.
  // For now, if entityId is present, we check if it's "business" type or just show it if it aligns.
  // Assumption: ERP is for the main business.
  const isBusinessView = entityId ? entities.find(e => e.id === entityId)?.type === 'business' : true;
  const automatedIncome = isBusinessView ? erpIncome : 0;

  // Grand Totals
  const totalIncome = manualIncome + automatedIncome;
  const totalExpenses = manualExpenses + automatedExpenses;
  const balance = totalIncome - totalExpenses;
  const totalFlow = totalIncome + totalExpenses;

  const incomePercentage = totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 50;
  const expensePercentage = totalFlow > 0 ? (totalExpenses / totalFlow) * 100 : 50;


  // Handle loading state
  if (contextLoading || loadingErp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg animate-pulse">Cargando flujo de caja...</div>
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
        entityId: entityId || '', // Pre-fill current entity
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
        name: `${itemType === 'income' ? 'Ingreso' : 'Gasto'} Manual: ${formData.description || 'Sin descripción'}`,
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
        await updateProjection(editingProjection.id, projectionData);
      } else {
        await createProjection(projectionData);
      }

      handleOpenChange(false);
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

  const handleDelete = async (projectionId: string) => {
    if (confirm('¿Estás seguro de eliminar esta entrada manual?')) {
      try {
        await deleteProjection(projectionId);
      } catch (error) {
        console.error(error);
      }
    }
  };


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
      return item.category.split(':')[0];
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flujo de Caja Proyectado</h1>
          <p className="text-muted-foreground">
            Análisis mensual basado en tus servicios activos (ERP), gastos recurrentes y ajustes manuales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleOpenDialog('income')} className="gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            Ajuste Ingreso
          </Button>
          <Button onClick={() => handleOpenDialog('expense')} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Ajuste Gasto
          </Button>
        </div>
      </div>

      {/* Main Cash Flow Card */}
      <Card className="border-2 border-primary/20 shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <span>Flujo Mensual Estimado</span>
            </CardTitle>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Balance Disponible</span>
              <span className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                {isBalanceHidden ? '****' : formatCurrency(balance)}
              </span>
            </div>
          </div>

          {/* Visual Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-blue-600 dark:text-blue-400">
                Total Ingresos: {isBalanceHidden ? '****' : formatCurrency(totalIncome)}
              </span>
              <span className="text-red-600 dark:text-red-400">
                Total Gastos: {isBalanceHidden ? '****' : formatCurrency(totalExpenses)}
              </span>
            </div>

            <div className="relative h-12 bg-muted rounded-xl overflow-hidden flex shadow-inner">
              {/* Income Bar */}
              <div
                className="bg-blue-500 dark:bg-blue-600 flex items-center justify-start px-4 transition-all duration-700 ease-out"
                style={{ width: `${incomePercentage}%` }}
              >
                {incomePercentage > 10 && (
                  <span className="text-xs md:text-sm font-bold text-white drop-shadow-md whitespace-nowrap overflow-hidden">
                    INGRESOS {Math.round(incomePercentage)}%
                  </span>
                )}
              </div>
              {/* Expense Bar */}
              <div
                className="bg-red-500 dark:bg-red-600 flex items-center justify-end px-4 transition-all duration-700 ease-out"
                style={{ width: `${expensePercentage}%` }}
              >
                {expensePercentage > 10 && (
                  <span className="text-xs md:text-sm font-bold text-white drop-shadow-md whitespace-nowrap overflow-hidden">
                    GASTOS {Math.round(expensePercentage)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* INCOME DETAILS */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Detalle de Ingresos
          </h3>

          {/* Automated ERP Income */}
          {isBusinessView && (
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Servicios ERP (Recurrentes)
                  </span>
                  <span>{isBalanceHidden ? '****' : formatCurrency(erpIncome)}</span>
                </CardTitle>
                <CardDescription>Calculado automáticamente de servicios activos</CardDescription>
              </CardHeader>
              {erpSubscriptions.length > 0 && (
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground mt-2 border-t pt-2 space-y-1">
                    {erpSubscriptions.slice(0, 3).map(sub => (
                      <div key={sub.id} className="flex justify-between">
                        <span className='truncate max-w-[180px]'>{sub.name}</span>
                        <span>
                          {isBalanceHidden ? '****' : (sub.currency === 'UF' ? 'UF ' + formatCurrency(Number(sub.amount)) : formatCurrency(Number(sub.amount) / (sub.frequency === 'yearly' ? 12 : 1)))}
                        </span>
                      </div>
                    ))}
                    {erpSubscriptions.length > 3 && (
                      <div className="text-xs italic pt-1">+ {erpSubscriptions.length - 3} servicios más...</div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Manual Income Projections */}
          {filteredProjections.filter(p => getIncomeItems(p).length > 0).map(projection => {
            const items = getIncomeItems(projection);
            const item = items[0];
            return (
              <Card key={projection.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{item.description || 'Ingreso Manual'}</div>
                    <div className="text-xs text-muted-foreground">Ajuste Manual</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-blue-600">{isBalanceHidden ? '****' : formatCurrency(item.amount)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog('income', projection)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(projection.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* EXPENSE DETAILS */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Detalle de Gastos
          </h3>

          {/* Automated Expenses (Gastos) */}
          <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex justify-between">
                <span className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Gastos Recurrentes (Suscripciones)
                </span>
                <span>{isBalanceHidden ? '****' : formatCurrency(automatedExpenses)}</span>
              </CardTitle>
              <CardDescription>Calculado automáticamente de "Gastos"</CardDescription>
            </CardHeader>
            {filteredEntitySubscriptions.length > 0 && (
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground mt-2 border-t pt-2 space-y-1">
                  {filteredEntitySubscriptions.slice(0, 3).map(sub => (
                    <div key={sub.id} className="flex justify-between">
                      <span className='truncate max-w-[180px]'>{sub.name}</span>
                      <span>{isBalanceHidden ? '****' : formatCurrency(Number(sub.amount) / (sub.billingCycle === 'yearly' ? 12 : 1))}</span>
                    </div>
                  ))}
                  {filteredEntitySubscriptions.length > 3 && (
                    <div className="text-xs italic pt-1">+ {filteredEntitySubscriptions.length - 3} gastos más...</div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Manual Expense Projections */}
          {filteredProjections.filter(p => getExpenseItems(p).length > 0).map(projection => {
            const items = getExpenseItems(projection);
            const item = items[0];
            return (
              <Card key={projection.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{item.description || 'Gasto Manual'}</div>
                    <div className="text-xs text-muted-foreground">Ajuste Manual</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-red-600">{isBalanceHidden ? '****' : formatCurrency(item.amount)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog('expense', projection)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(projection.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>


      {/* Add Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProjection ? 'Editar' : 'Agregar'} {itemType === 'income' ? 'Ingreso' : 'Gasto'} Manual
            </DialogTitle>
            <DialogDescription>
              Estos ajustes se agregan al flujo automático.
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
                placeholder="Ej: Ajuste por vacaciones, Bono, etc."
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
                handleOpenChange(false);
                setEditingProjection(null);
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProjection ? 'Guardar Cambios' : `Agregar`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
