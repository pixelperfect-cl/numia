/**
 * Numia v1.0 - Interactive Cash Flow Area Chart
 * Similar to Shadcn UI Area Chart - Interactive
 */

import { useMemo, useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Movement, DateFilterType, DateFilter } from '@/types';
import { formatCurrency, parseLocalDate, getDateRangeFromType } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useData } from '@/contexts/DataContext';

interface InteractiveCashFlowChartProps {
  movements: Movement[];
}

const chartConfig = {
  income: {
    label: 'Ingresos',
    color: 'hsl(217 91% 60%)', // Blue
  },
  expense: {
    label: 'Gastos',
    color: 'hsl(4 90% 58%)', // Red/Orange
  },
} satisfies ChartConfig;

export function InteractiveCashFlowChart({ movements }: InteractiveCashFlowChartProps) {
  const { isBalanceHidden } = usePrivacy();
  const { dateFilter: globalDateFilter } = useData();

  // Local state for independent filtering, initialized/synced with global filter
  const [localFilter, setLocalFilter] = useState<DateFilter>(globalDateFilter);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Sync with global filter when it changes
  useEffect(() => {
    setLocalFilter(globalDateFilter);
  }, [globalDateFilter]);

  // Get date range based on local filter
  const dateRange = useMemo(() => {
    return getDateRangeFromType(localFilter.type, localFilter.startDate, localFilter.endDate);
  }, [localFilter]);

  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  // Calculate data based on period type
  const { chartData, totalIncome, totalExpense } = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    // Determine grouping strategy based on date range
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const groupByMonth = daysDiff > 90; // Group by month if more than 90 days

    const dataMap: Record<string, { income: number; expense: number; date: Date; label: string }> = {};

    movements.forEach((movement) => {
      const movementDate = parseLocalDate(movement.date);
      if (movementDate >= startDate && movementDate <= endDate) {
        let key: string;
        let label: string;

        if (groupByMonth) {
          // Group by month
          key = `${movementDate.getFullYear()}-${String(movementDate.getMonth() + 1).padStart(2, '0')}`;
          label = movementDate.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }).replace('.', '');
        } else {
          // Group by day
          key = movement.date; // Already in YYYY-MM-DD format
          label = String(movementDate.getDate());
        }

        if (!dataMap[key]) {
          dataMap[key] = {
            income: 0,
            expense: 0,
            date: groupByMonth ? new Date(movementDate.getFullYear(), movementDate.getMonth(), 1) : movementDate,
            label: label,
          };
        }

        const amount = Math.abs(movement.amount);
        if (movement.type === 'income') {
          dataMap[key].income += amount;
          totalIncome += amount;
        } else {
          dataMap[key].expense += amount;
          totalExpense += amount;
        }
      }
    });

    // Convert to array and sort by date
    const chartData = Object.entries(dataMap)
      .map(([_, data]) => ({
        date: data.date,
        label: data.label,
        income: data.income,
        expense: data.expense,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return { chartData, totalIncome, totalExpense };
  }, [movements, startDate, endDate]);

  const balance = totalIncome - totalExpense;

  // Period options for selector
  const periodOptions: { value: DateFilterType | 'ALL'; label: string }[] = [
    { value: 'TODAY', label: 'Hoy' },
    { value: 'THIS_WEEK', label: 'Esta Semana' },
    { value: 'LAST_WEEK', label: 'Semana Pasada' },
    { value: 'THIS_MONTH', label: 'Este Mes' },
    { value: 'LAST_MONTH', label: 'Mes Pasado' },
    { value: 'THIS_YEAR', label: 'Este Año' },
    { value: 'LAST_YEAR', label: 'Año Pasado' },
    { value: 'ALL', label: 'Historico' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle>Flujo de Caja</CardTitle>

          {/* Local Period Selector */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={localFilter.type}
                onValueChange={(val: DateFilterType | 'ALL') => {
                  if (val === 'CUSTOM') {
                    setLocalFilter({ type: 'CUSTOM', startDate: undefined, endDate: undefined });
                  } else {
                    setLocalFilter({ type: val });
                  }
                }}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {localFilter.type === 'CUSTOM' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs font-normal", !localFilter.startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {localFilter.startDate ? (
                        localFilter.endDate ? (
                          <>
                            {format(new Date(localFilter.startDate), "dd/MM/yy")} -{" "}
                            {format(new Date(localFilter.endDate), "dd/MM/yy")}
                          </>
                        ) : (
                          format(new Date(localFilter.startDate), "dd/MM/yy")
                        )
                      ) : (
                        <span>Fechas</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={localFilter.startDate ? new Date(localFilter.startDate) : new Date()}
                      selected={{
                        from: localFilter.startDate ? new Date(localFilter.startDate) : undefined,
                        to: localFilter.endDate ? new Date(localFilter.endDate) : undefined,
                      }}
                      onSelect={(range) => {
                        if (range?.from) {
                          setLocalFilter({
                            type: 'CUSTOM',
                            startDate: range.from.toISOString().split('T')[0],
                            endDate: range.to ? range.to.toISOString().split('T')[0] : undefined
                          });
                        } else {
                          setLocalFilter({ type: 'CUSTOM', startDate: undefined, endDate: undefined });
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <CardDescription>
              {startDate.toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {' - '}
              {endDate.toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </CardDescription>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isBalanceHidden ? '****' : formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {isBalanceHidden ? '****' : formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p
              className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
            >
              {isBalanceHidden ? '****' : formatCurrency(balance)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 10,
                right: 12,
                bottom: 0,
                left: 12,
              }}
            >
              <defs>
                <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-income)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-income)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-expense)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-expense)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                opacity={0.2}
                stroke="hsl(var(--muted-foreground))"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => isBalanceHidden ? '' : `$${(value / 1000).toFixed(0)}k`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <ChartTooltip
                cursor={true}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value, payload) => {
                      if (payload && payload[0]) {
                        const date = (payload[0].payload as any).date;
                        return date.toLocaleDateString('es-CL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        });
                      }
                      return value;
                    }}
                    formatter={(value, name) => (
                      <div className="flex min-w-[130px] items-center text-xs text-muted-foreground">
                        <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                          <span className="font-normal text-muted-foreground">{isBalanceHidden ? '' : '$'}</span>
                          {isBalanceHidden ? '****' : (value as number).toLocaleString('es-CL')}
                        </div>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="income"
                type="monotone"
                fill="url(#fillIncome)"
                fillOpacity={0.4}
                stroke="var(--color-income)"
                strokeWidth={2}
                style={{
                  transition: 'all 0.3s ease',
                }}
              />
              <Area
                dataKey="expense"
                type="monotone"
                fill="url(#fillExpense)"
                fillOpacity={0.4}
                stroke="var(--color-expense)"
                strokeWidth={2}
                style={{
                  transition: 'all 0.3s ease',
                }}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No hay movimientos registrados en este período
          </div>
        )}
      </CardContent>
    </Card >
  );
}
