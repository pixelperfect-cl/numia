/**
 * Numia v1.0 - Category Distribution Pie Chart
 */

import { useMemo, useState, useEffect } from 'react';
import { Pie, PieChart, Cell, Sector } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Movement, MovementType, Category, DateFilter as DateFilterType } from '@/types';
import { formatCurrency, getDateRangeFromType, parseLocalDate } from '@/lib/utils';
import { DateFilter } from '@/components/DateFilter';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useData } from '@/contexts/DataContext';

interface CategoryPieChartProps {
  movements: Movement[];
  categories: Category[];
  type: MovementType;
}

// Paleta de colores para las categorías
const COLORS = [
  'hsl(220 70% 50%)', // Blue
  'hsl(340 75% 50%)', // Pink
  'hsl(160 60% 45%)', // Teal
  'hsl(30 80% 55%)',  // Orange
  'hsl(280 65% 60%)', // Purple
  'hsl(50 90% 50%)',  // Yellow
  'hsl(120 45% 50%)', // Green
  'hsl(0 70% 50%)',   // Red
];

// Custom active shape for hover effect
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
        style={{
          filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))',
          transition: 'all 0.3s ease',
        }}
      />
    </g>
  );
};

export function CategoryPieChart({ movements, categories, type }: CategoryPieChartProps) {
  const { isBalanceHidden } = usePrivacy();
  const { dateFilter: globalDateFilter } = useData();
  const [dateFilter, setDateFilter] = useState<DateFilterType>(globalDateFilter);

  useEffect(() => {
    setDateFilter(globalDateFilter);
  }, [globalDateFilter]);

  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const { startDate, endDate } = getDateRangeFromType(dateFilter.type, dateFilter.startDate, dateFilter.endDate);

  const { chartData, total } = useMemo(() => {
    // Filter by type and date range
    const filtered = movements.filter((m) => {
      const movementDate = parseLocalDate(m.date);
      return m.type === type && movementDate >= startDate && movementDate <= endDate;
    });

    // Group by category and subcategory
    const categoryTotals: Record<string, { amount: number; categoryId: string; color: string }> = {};
    filtered.forEach((movement) => {
      // Find category from categoryId
      const category = categories.find(c => c.id === movement.categoryId);
      const categoryName = category?.name || movement.category || 'Sin categoría';

      // Create display name with subcategory if exists
      let displayName = categoryName;
      if (movement.subcategory) {
        displayName = `${categoryName} > ${movement.subcategory}`;
      }

      const amount = Math.abs(movement.amount);

      if (!categoryTotals[displayName]) {
        categoryTotals[displayName] = {
          amount: 0,
          categoryId: movement.categoryId,
          color: category?.color || '#888888',
        };
      }
      categoryTotals[displayName].amount += amount;
    });

    // Convert to chart data
    const chartData = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        categoryId: data.categoryId,
        color: data.color,
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = chartData.reduce((sum, item) => sum + item.amount, 0);

    return { chartData, total };
  }, [movements, categories, type, startDate, endDate]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item) => {
      config[item.category] = {
        label: item.category,
        color: item.color,
      };
    });
    return config;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="!bg-card/40 backdrop-blur-sm !border-white/10 overflow-hidden transition-all duration-300 hover:border-white/20">
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-row items-center justify-between">
              <CardTitle>{type === 'income' ? 'Ingresos' : 'Gastos'} por Categoría</CardTitle>
              <DateFilter value={dateFilter} onChange={setDateFilter} />
            </div>
            <CardDescription>
              {startDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay {type === 'income' ? 'ingresos' : 'gastos'} registrados
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="!bg-card/40 backdrop-blur-sm !border-white/10 overflow-hidden transition-all duration-300 hover:border-white/20">
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>{type === 'income' ? 'Ingresos' : 'Gastos'} por Categoría</CardTitle>
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
          <CardDescription>
            {startDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    isBalanceHidden ? '****' : `${formatCurrency(value as number)} (${((value as number / total) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ category, percent }) =>
                percent > 0.05 ? `${category} ${(percent * 100).toFixed(0)}%` : ''
              }
              labelLine={false}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={0.9}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {chartData.slice(0, 6).map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.category}</span>
              <span className="ml-auto text-muted-foreground">
                {isBalanceHidden ? '****' : formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center font-semibold">
            <span>Total</span>
            <span className={type === 'income' ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}>
              {isBalanceHidden ? '****' : formatCurrency(total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
