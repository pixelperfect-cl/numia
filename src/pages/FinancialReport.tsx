/**
 * Numia v1.0 - Financial Report Page
 * Comprehensive financial reporting with income, expenses, categories, and trends
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { ReportCard } from '@/components/reports/ReportCard';
import { ReportFilters, type ReportFilterState } from '@/components/reports/ReportFilters';
import { formatCurrency } from '@/lib/utils';
import {
    calculateCategoryBreakdown,
    calculateMonthlyTrends,
    calculateYearOverYear,
    calculateBoxBalances,
    filterMovementsByDateRange,
    getTopCategories,
    getDateRangePreset,
    groupSmallCategories
} from '@/lib/reportUtils';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowLeftRight,
    PieChart,
    BarChart3
} from 'lucide-react';
import { Bar, BarChart, Line, LineChart, Pie, PieChart as RechartsPieChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { CategoryList } from '@/components/reports/CategoryList';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function FinancialReport() {
    const { movements, categories, entities, loading } = useData();
    const [trendPeriod, setTrendPeriod] = useState<'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'last-year'>('last-6-months');
    const [filters, setFilters] = useState<ReportFilterState>(() => {
        const { start, end } = getDateRangePreset('this-month');
        return {
            dateRange: { start, end },
            entityIds: [],
            preset: 'this-month'
        };
    });

    // Filter movements based on selected filters
    const filteredMovements = useMemo(() => {
        let filtered = movements;

        // Filter by date range
        if (filters.dateRange.start || filters.dateRange.end) {
            filtered = filterMovementsByDateRange(
                filtered,
                filters.dateRange.start,
                filters.dateRange.end
            );
        }

        // Filter by entity
        if (filters.entityIds.length > 0) {
            filtered = filtered.filter(m => filters.entityIds.includes(m.entityId));
        }

        return filtered;
    }, [movements, filters]);

    // Calculate summary metrics
    const summary = useMemo(() => {
        const income = filteredMovements
            .filter(m => m.type === 'income')
            .reduce((sum, m) => sum + m.amount, 0);

        const expenses = filteredMovements
            .filter(m => m.type === 'expense')
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);

        return {
            income,
            expenses,
            balance: income - expenses,
            count: filteredMovements.length
        };
    }, [filteredMovements]);

    // Calculate category breakdowns
    const incomeBreakdown = useMemo(() =>
        calculateCategoryBreakdown(filteredMovements, categories, 'income'),
        [filteredMovements, categories]
    );

    const expenseBreakdown = useMemo(() =>
        calculateCategoryBreakdown(filteredMovements, categories, 'expense'),
        [filteredMovements, categories]
    );

    // Calculate monthly trends based on selected period
    const monthlyTrends = useMemo(() => {
        let monthsToShow = 6;
        switch (trendPeriod) {
            case 'this-month':
                monthsToShow = 1;
                break;
            case 'last-month':
                monthsToShow = 2;
                break;
            case 'last-3-months':
                monthsToShow = 3;
                break;
            case 'last-6-months':
                monthsToShow = 6;
                break;
            case 'this-year':
                monthsToShow = 12;
                break;
            case 'last-year':
                monthsToShow = 12;
                break;
        }
        return calculateMonthlyTrends(movements, monthsToShow);
    }, [movements, trendPeriod]);

    // Calculate year comparison
    const yearComparison = useMemo(() =>
        calculateYearOverYear(movements),
        [movements]
    );

    // Calculate box balances
    const boxBalances = useMemo(() =>
        calculateBoxBalances(filteredMovements),
        [filteredMovements]
    );

    // Get top categories
    const topIncome = useMemo(() => getTopCategories(incomeBreakdown, 5), [incomeBreakdown]);
    const topExpenses = useMemo(() => getTopCategories(expenseBreakdown, 5), [expenseBreakdown]);

    // Group small categories for pie charts (< 5%)
    const groupedIncomeForChart = useMemo(() => groupSmallCategories(incomeBreakdown, 5), [incomeBreakdown]);
    const groupedExpenseForChart = useMemo(() => groupSmallCategories(expenseBreakdown, 5), [expenseBreakdown]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reporte Financiero</h1>
                <p className="text-muted-foreground">Análisis completo de ingresos, gastos y tendencias</p>
            </div>

            {/* Filters */}
            <ReportFilters
                onFilterChange={setFilters}
                showEntityFilter={true}
                entities={entities}
            />

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <ReportCard
                    title="Ingresos Totales"
                    value={formatCurrency(summary.income)}
                    icon={TrendingUp}
                    description="Período seleccionado"
                    loading={loading}
                    valueClassName="text-blue-600 dark:text-blue-500"
                />
                <ReportCard
                    title="Gastos Totales"
                    value={formatCurrency(summary.expenses)}
                    icon={TrendingDown}
                    description="Período seleccionado"
                    loading={loading}
                    valueClassName="text-red-600 dark:text-red-500"
                />
                <ReportCard
                    title="Balance"
                    value={formatCurrency(summary.balance)}
                    icon={Wallet}
                    description="Período seleccionado"
                    loading={loading}
                    valueClassName={summary.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}
                />
                <ReportCard
                    title="Movimientos"
                    value={summary.count}
                    icon={ArrowLeftRight}
                    description="Registros totales"
                    loading={loading}
                    valueClassName="text-purple-600 dark:text-purple-500"
                />
            </div>

            {/* Monthly Trends Chart */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Tendencias
                        </CardTitle>
                        <Select value={trendPeriod} onValueChange={(value: any) => setTrendPeriod(value)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this-month">Este mes</SelectItem>
                                <SelectItem value="last-month">Mes anterior</SelectItem>
                                <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
                                <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
                                <SelectItem value="this-year">Este año</SelectItem>
                                <SelectItem value="last-year">Año anterior</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="month"
                                className="text-xs"
                                tickFormatter={(value) => {
                                    const [year, month] = value.split('-');
                                    return `${month}/${year.slice(2)}`;
                                }}
                            />
                            <YAxis className="text-xs" tickFormatter={(value) => formatCurrency(value)} />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                labelFormatter={(label) => {
                                    const [year, month] = label.split('-');
                                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="income" stroke="#3b82f6" name="Ingresos" strokeWidth={2} />
                            <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Gastos" strokeWidth={2} />
                            <Line type="monotone" dataKey="balance" stroke="#10b981" name="Balance" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Category Breakdown Charts */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Income Categories */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Categorías de Ingresos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {incomeBreakdown.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RechartsPieChart>
                                        <Pie
                                            data={groupedIncomeForChart}
                                            dataKey="total"
                                            nameKey="categoryName"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(entry) => `${entry.categoryName}: ${entry.percentage.toFixed(1)}%`}
                                        >
                                            {groupedIncomeForChart.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                                <div className="mt-4">
                                    <CategoryList categories={incomeBreakdown} colors={COLORS} />
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No hay ingresos en el período seleccionado
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Expense Categories */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Categorías de Gastos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expenseBreakdown.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RechartsPieChart>
                                        <Pie
                                            data={groupedExpenseForChart}
                                            dataKey="total"
                                            nameKey="categoryName"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(entry) => `${entry.categoryName}: ${entry.percentage.toFixed(1)}%`}
                                        >
                                            {groupedExpenseForChart.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                                <div className="mt-4">
                                    <CategoryList categories={expenseBreakdown} colors={COLORS} />
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No hay gastos en el período seleccionado
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Categories Bar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Top 5 Categorías por Monto</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={[
                            ...topIncome.map(cat => ({ ...cat, type: 'Ingreso' })),
                            ...topExpenses.map(cat => ({ ...cat, type: 'Gasto' }))
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="categoryName" className="text-xs" />
                            <YAxis className="text-xs" tickFormatter={(value) => formatCurrency(value)} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="total" fill="#3b82f6" name="Monto" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Box Balances */}
            <Card>
                <CardHeader>
                    <CardTitle>Balances por Caja</CardTitle>
                </CardHeader>
                <CardContent>
                    {Object.keys(boxBalances).length > 0 ? (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(boxBalances).map(([box, balance]) => (
                                <div key={box} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                    <span className="font-medium">{box}</span>
                                    <span className={`font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                                        {formatCurrency(balance)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No hay cajas con movimientos en el período seleccionado
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Year Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>Comparación Año Actual vs Anterior</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-4">Año</th>
                                    <th className="text-right py-2 px-4">Ingresos</th>
                                    <th className="text-right py-2 px-4">Gastos</th>
                                    <th className="text-right py-2 px-4">Balance</th>
                                    <th className="text-right py-2 px-4">Movimientos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {yearComparison.map((year) => (
                                    <tr key={year.year} className="border-b">
                                        <td className="py-2 px-4 font-medium">{year.year}</td>
                                        <td className="py-2 px-4 text-right text-blue-600 dark:text-blue-500">
                                            {formatCurrency(year.income)}
                                        </td>
                                        <td className="py-2 px-4 text-right text-red-600 dark:text-red-500">
                                            {formatCurrency(year.expenses)}
                                        </td>
                                        <td className={`py-2 px-4 text-right font-semibold ${year.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                                            {formatCurrency(year.balance)}
                                        </td>
                                        <td className="py-2 px-4 text-right">{year.movementCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
