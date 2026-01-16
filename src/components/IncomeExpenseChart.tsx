/**
 * Numia v1.0 - Income/Expense Bar Chart
 */

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Movement, DateFilter as DateFilterType } from '@/types';
import { formatCurrency, getDateRangeFromType, parseLocalDate } from '@/lib/utils';
import { DateFilter } from '@/components/DateFilter';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface IncomeExpenseChartProps {
  movements: Movement[];
}

const chartConfig = {
  income: {
    label: 'Ingresos',
    color: 'hsl(220 70% 50%)', // Softer blue
  },
  expense: {
    label: 'Gastos',
    color: 'hsl(0 70% 50%)', // Softer red
  },
} satisfies ChartConfig;

export function IncomeExpenseChart({ movements }: IncomeExpenseChartProps) {
  const { isBalanceHidden } = usePrivacy();
  const [dateFilter, setDateFilter] = useState<DateFilterType>({ type: 'THIS_MONTH' });
  const { startDate, endDate } = getDateRangeFromType(dateFilter.type, dateFilter.startDate, dateFilter.endDate);

  // Calculate the date range in days
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const { chartData, totalIncome, totalExpense } = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const groupByMonth = daysDiff > 31; // Group by month if range is larger than a month

    if (groupByMonth) {
      // Group by month for large date ranges
      const monthlyData: Record<string, { income: number; expense: number; date: Date }> = {};

      movements.forEach((movement) => {
        const movementDate = parseLocalDate(movement.date);
        if (movementDate >= startDate && movementDate <= endDate) {
          // Create month key (YYYY-MM)
          const monthKey = `${movementDate.getFullYear()}-${String(movementDate.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              income: 0,
              expense: 0,
              date: new Date(movementDate.getFullYear(), movementDate.getMonth(), 1),
            };
          }

          const amount = Math.abs(movement.amount);
          if (movement.type === 'income') {
            monthlyData[monthKey].income += amount;
            totalIncome += amount;
          } else {
            monthlyData[monthKey].expense += amount;
            totalExpense += amount;
          }
        }
      });

      // Convert to array and sort by date
      const chartData = Object.entries(monthlyData)
        .map(([monthKey, data]) => ({
          date: data.date,
          dateLabel: data.date.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''),
          income: data.income,
          expense: data.expense,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return { chartData, totalIncome, totalExpense };
    } else {
      // Group by day for smaller date ranges
      const dailyData: Record<string, { income: number; expense: number; date: Date }> = {};

      // Initialize all days in the range with 0 values
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        dailyData[dateKey] = { income: 0, expense: 0, date: new Date(currentDate) };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Add movement data to corresponding days
      movements.forEach((movement) => {
        const movementDate = parseLocalDate(movement.date);
        if (movementDate >= startDate && movementDate <= endDate) {
          const dateKey = movementDate.toISOString().split('T')[0];

          const amount = Math.abs(movement.amount);
          if (movement.type === 'income') {
            dailyData[dateKey].income += amount;
            totalIncome += amount;
          } else {
            dailyData[dateKey].expense += amount;
            totalExpense += amount;
          }
        }
      });

      // Convert to array and sort by date
      const chartData = Object.entries(dailyData)
        .map(([dateKey, data]) => ({
          date: data.date,
          dateLabel: data.date.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' }).replace('.', ''),
          income: data.income,
          expense: data.expense,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return { chartData, totalIncome, totalExpense };
    }
  }, [movements, startDate, endDate]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs Gastos</CardTitle>
          <CardDescription>No hay datos para mostrar en este período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay movimientos registrados
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Ingresos vs Gastos</CardTitle>
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardDescription>
              {startDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
            </CardDescription>
            <div className="flex gap-4 sm:gap-6 flex-shrink-0">
              <div className="text-left sm:text-right flex-1 sm:flex-none">
                <div className="text-xs text-muted-foreground mb-1">Ingresos</div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-500">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-500">
                    {isBalanceHidden ? '****' : formatCurrency(totalIncome)}
                  </div>
                </div>
              </div>
              <div className="text-left sm:text-right flex-1 sm:flex-none">
                <div className="text-xs text-muted-foreground mb-1">Gastos</div>
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-500">
                  <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-500">
                    {isBalanceHidden ? '****' : formatCurrency(totalExpense)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 overflow-x-auto">
        <ChartContainer config={chartConfig} className="h-[350px] w-full min-w-[300px]">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 10, right: 2, bottom: 60, left: 2 }}
            barGap={2}
            barCategoryGap="2%"
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              opacity={0.1}
              stroke="hsl(var(--muted-foreground))"
            />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: daysDiff > 31 ? 11 : 8 }}
              interval={0}
              angle={daysDiff > 31 ? 0 : -45}
              textAnchor={daysDiff > 31 ? 'middle' : 'end'}
              height={60}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.2)', radius: 4 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{isBalanceHidden ? '****' : formatCurrency(value as number)}</span>
                      <span className="text-muted-foreground">
                        {name === 'income' ? 'Ingresos' : 'Gastos'}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              radius={[4, 4, 0, 0]}
              opacity={0.9}
              style={{
                filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))',
                transition: 'all 0.3s ease',
              }}
            />
            <Bar
              dataKey="expense"
              fill="var(--color-expense)"
              radius={[4, 4, 0, 0]}
              opacity={0.9}
              style={{
                filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))',
                transition: 'all 0.3s ease',
              }}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
