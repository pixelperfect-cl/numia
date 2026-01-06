/**
 * Numia v1.0 - Dashboard Page
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, calculateSummary, parseLocalDate } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from 'lucide-react';
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart';
import { MovementsAreaChart } from '@/components/MovementsAreaChart';
import { CategoryPieChart } from '@/components/CategoryPieChart';
import { IconComponent } from '@/components/IconPicker';
import { InteractiveCashFlowChart } from '@/components/InteractiveCashFlowChart';

export function Dashboard() {
  const { movements, entities, categories, loading } = useData();

  // Calculate summary (all time)
  const totalSummary = calculateSummary(movements);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen global de todas tus finanzas</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500 break-words">
              {formatCurrency(totalSummary.income)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total acumulado
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500 break-words">
              {formatCurrency(totalSummary.expenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total acumulado
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
            <Wallet className={`h-5 w-5 flex-shrink-0 ${totalSummary.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold break-words ${totalSummary.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
              {formatCurrency(totalSummary.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Balance actual (acumulado)
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
              {movements.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registros totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Cash Flow Chart - NEW */}
      <InteractiveCashFlowChart movements={movements} />

      {/* Income/Expense Chart */}
      <IncomeExpenseChart movements={movements} />

      {/* Movements Activity Chart */}
      <MovementsAreaChart movements={movements} />

      {/* Category Distribution Charts */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <CategoryPieChart movements={movements} categories={categories} type="income" />
        <CategoryPieChart movements={movements} categories={categories} type="expense" />
      </div>

      {/* Entities Card */}
      <Card>
        <CardHeader>
          <CardTitle>Entidades</CardTitle>
        </CardHeader>
        <CardContent>
          {entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay entidades creadas. Crea tu primera entidad para comenzar.
            </p>
          ) : (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {entities.map((entity) => {
                const entityMovements = movements.filter(m => m.entityId === entity.id);
                const entitySummary = calculateSummary(entityMovements);
                return (
                  <div key={entity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="p-1.5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${entity.color}20`, color: entity.color || '#3b82f6' }}
                      >
                        <IconComponent iconKey={entity.icon} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entity.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{entity.type}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`text-sm font-semibold ${entitySummary.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                        {formatCurrency(entitySummary.balance)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay movimientos registrados.
            </p>
          ) : (
            <div className="space-y-2">
              {movements.slice(0, 10).map((movement) => {
                const entity = entities.find(e => e.id === movement.entityId);
                const Icon = movement.type === 'income' ? TrendingUp : TrendingDown;
                return (
                  <div key={movement.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${movement.type === 'income' ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium">{movement.description}</p>
                        <p className="text-xs text-muted-foreground">{entity?.name || 'N/A'} • {movement.box}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${movement.type === 'income' ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                        {movement.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(movement.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">{parseLocalDate(movement.date).toLocaleDateString('es-CL')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
