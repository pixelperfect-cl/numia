/**
 * Numia v1.0 - Movements Activity Area Chart
 */

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Movement, DateFilter as DateFilterType } from '@/types';
import { getDateRangeFromType, parseLocalDate } from '@/lib/utils';
import { DateFilter } from '@/components/DateFilter';

interface MovementsAreaChartProps {
  movements: Movement[];
}

const chartConfig = {
  movements: {
    label: 'Movimientos',
    color: 'hsl(220 10% 60%)', // Light gray for better visibility
  },
} satisfies ChartConfig;

export function MovementsAreaChart({ movements }: MovementsAreaChartProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterType>({ type: 'THIS_MONTH' });
  const { startDate, endDate } = getDateRangeFromType(dateFilter.type, dateFilter.startDate, dateFilter.endDate);

  const chartData = useMemo(() => {
    // Group movements by day and count them
    const dailyCount: Record<string, number> = {};

    movements.forEach((movement) => {
      const movementDate = parseLocalDate(movement.date);
      if (movementDate >= startDate && movementDate <= endDate) {
        const day = movementDate.getDate();
        const key = `${day}`;

        if (!dailyCount[key]) {
          dailyCount[key] = 0;
        }

        dailyCount[key]++;
      }
    });

    // Convert to array and sort by day
    return Object.entries(dailyCount)
      .map(([day, count]) => ({
        day: parseInt(day),
        movements: count,
      }))
      .sort((a, b) => a.day - b.day);
  }, [movements, startDate, endDate]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actividad de Movimientos</CardTitle>
          <CardDescription>No hay datos para mostrar en este período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No hay movimientos registrados
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMovements = chartData.reduce((sum, item) => sum + item.movements, 0);
  const avgMovements = (totalMovements / chartData.length).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Actividad de Movimientos</CardTitle>
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
          <CardDescription>
            {startDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-[300px]">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => `Día ${value}`}
                  formatter={(value, name) => [
                    `${value} ${value === 1 ? 'movimiento' : 'movimientos'}`,
                    'Total',
                  ]}
                />
              }
            />
            <defs>
              <linearGradient id="fillMovements" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-movements)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-movements)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="movements"
              type="monotone"
              fill="url(#fillMovements)"
              fillOpacity={0.4}
              stroke="var(--color-movements)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 text-sm text-muted-foreground">
          <span>Total: {totalMovements} movimientos</span>
          <span>Promedio: {avgMovements} por día</span>
        </div>
      </CardContent>
    </Card>
  );
}
