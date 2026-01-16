/**
 * Numia v1.0 - ERP Report Page
 * Comprehensive ERP reporting for clients, projects, and services
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { ReportCard } from '@/components/reports/ReportCard';
import { ReportFilters, type ReportFilterState } from '@/components/reports/ReportFilters';
import { formatCurrency } from '@/lib/utils';
import { fetchIndicators } from '@/lib/indicators';
import {
    calculateMRR,
    calculateARR,
    calculateCollectionRate,
    groupByClient,
    calculateProjectMetrics,
    getDateRangePreset,
    filterMovementsByDateRange
} from '@/lib/reportUtils';
import {
    Users,
    Briefcase,
    DollarSign,
    Activity,
    TrendingUp,
    BarChart3,
    PieChart as PieChartIcon
} from 'lucide-react';
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { getClients, getProjects, getSubscriptions } from '@/lib/firebase/database';
import type { Client, Project, Subscription } from '@/types';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function ERPReport() {
    const { user } = useAuth();
    const { isBalanceHidden } = usePrivacy();
    const { movements, entities, loading: dataLoading } = useData();
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [ufValue, setUfValue] = useState<number>(0);

    const [filters, setFilters] = useState<ReportFilterState>(() => {
        const { start, end } = getDateRangePreset('this-month');
        return {
            dateRange: { start, end },
            entityIds: [],
            preset: 'this-month'
        };
    });

    // Load ERP data
    useEffect(() => {
        if (user) {
            loadERPData();
        }
    }, [user]);

    const loadERPData = async () => {
        try {
            if (!user) return;
            setLoading(true);

            const [clientsData, projectsData, indicators] = await Promise.all([
                getClients(user.uid),
                getProjects(user.uid),
                fetchIndicators()
            ]);

            setUfValue(indicators.uf.valor);

            // Load subscriptions for all clients
            const allSubscriptions: Subscription[] = [];
            await Promise.all(
                clientsData.map(async (client) => {
                    const subs = await getSubscriptions(client.id, user.uid);
                    allSubscriptions.push(...subs);
                })
            );

            setClients(clientsData);
            setProjects(projectsData);
            setSubscriptions(allSubscriptions);
        } catch (error) {
            console.error('Error loading ERP data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter data based on selected filters
    const filteredData = useMemo(() => {
        let filteredMovements = movements;
        let filteredClients = clients;
        let filteredProjects = projects.filter(p => !p.archived); // Exclude archived projects
        let filteredSubscriptions = subscriptions;

        // Filter by entity
        if (filters.entityIds.length > 0) {
            filteredClients = clients.filter(c => filters.entityIds.includes(c.entityId));
            filteredProjects = projects.filter(p => filters.entityIds.includes(p.entityId) && !p.archived); // Exclude archived projects
            filteredMovements = movements.filter(m => filters.entityIds.includes(m.entityId));

            const clientIds = filteredClients.map(c => c.id);
            filteredSubscriptions = subscriptions.filter(s => clientIds.includes(s.clientId));
        } else {
            // Ensure archived projects are filtered out even when no entity filter is applied
            filteredProjects = projects.filter(p => !p.archived);
        }

        // Normalize subscriptions currency (Convert UF to CLP) checking against ufValue > 0
        if (ufValue > 0) {
            filteredSubscriptions = filteredSubscriptions.map(sub => {
                if (sub.currency === 'UF') {
                    return {
                        ...sub,
                        amount: (Number(sub.amount) || 0) * ufValue,
                        currency: 'CLP' // Normalize currency indicator as well for consistency if needed, though mostly amount matters
                    };
                }
                return sub;
            });
        }

        // Filter movements by date
        if (filters.dateRange.start || filters.dateRange.end) {
            filteredMovements = filterMovementsByDateRange(
                filteredMovements,
                filters.dateRange.start,
                filters.dateRange.end
            );
        }

        return {
            clients: filteredClients,
            projects: filteredProjects,
            subscriptions: filteredSubscriptions,
            movements: filteredMovements
        };
    }, [clients, projects, subscriptions, movements, filters, ufValue]);

    // Calculate metrics
    const metrics = useMemo(() => {
        const activeClientsList = filteredData.clients.filter(c => c.status === 'active');
        const activeClients = activeClientsList.length;
        const totalClients = filteredData.clients.length;
        const mrr = calculateMRR(filteredData.subscriptions);
        const arr = calculateARR(filteredData.subscriptions);
        const activeServices = filteredData.subscriptions.filter(s => s.status === 'active').length;
        const collectionRate = calculateCollectionRate(filteredData.subscriptions, filteredData.movements);
        const projectMetrics = calculateProjectMetrics(filteredData.projects);
        const clientRevenue = groupByClient(filteredData.subscriptions, activeClientsList, filteredData.movements)
            .filter(c => c.activeServices > 0); // Filter clients with 0 active services

        // Calculate Average Service Value (Only considering active paying services)
        const activePayingServices = filteredData.subscriptions.filter(s => s.status === 'active' && Number(s.amount) > 0).length;

        return {
            activeClients,
            totalClients,
            inactiveClients: totalClients - activeClients,
            mrr,
            arr,
            activeServices,
            totalServices: filteredData.subscriptions.length,
            collectionRate,
            projectMetrics,
            clientRevenue, // Return all clients, no limit
            averageServiceValue: activePayingServices > 0 ? mrr / activePayingServices : 0
        };
    }, [filteredData]);

    // Prepare chart data
    const projectStatusData = useMemo(() => {
        const statusLabels: Record<string, string> = {
            incoming: 'Entrante',
            design: 'Diseño',
            development: 'Desarrollo',
            review: 'Revisión',
            completed: 'Completado'
        };

        return Object.entries(metrics.projectMetrics.byStatus).map(([status, count]) => ({
            status: statusLabels[status] || status,
            count
        }));
    }, [metrics.projectMetrics]);

    const clientStatusData = useMemo(() => [
        { status: 'Activos', count: metrics.activeClients, color: '#10b981' },
        { status: 'Inactivos', count: metrics.inactiveClients, color: '#ef4444' }
    ], [metrics]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reporte ERP</h1>
                <p className="text-muted-foreground">Análisis de clientes, proyectos y servicios</p>
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
                    title="MRR"
                    value={isBalanceHidden ? '****' : formatCurrency(metrics.mrr)}
                    icon={DollarSign}
                    description="Ingresos recurrentes mensuales"
                    loading={loading || dataLoading}
                    valueClassName="text-emerald-600 dark:text-emerald-500"
                />
                <ReportCard
                    title="Clientes Activos"
                    value={metrics.activeClients}
                    icon={Users}
                    description={`De ${metrics.totalClients} totales`}
                    loading={loading || dataLoading}
                    valueClassName="text-blue-600 dark:text-blue-500"
                />
                <ReportCard
                    title="Proyectos Activos"
                    value={metrics.projectMetrics.total - (metrics.projectMetrics.byStatus['completed'] || 0)}
                    icon={Briefcase}
                    description={`${metrics.projectMetrics.completionRate.toFixed(1)}% completados`}
                    loading={loading || dataLoading}
                    valueClassName="text-amber-600 dark:text-amber-500"
                />
                <ReportCard
                    title="Tasa de Cobro"
                    value={`${metrics.collectionRate.toFixed(1)}%`}
                    icon={Activity}
                    description="Últimos 3 meses"
                    loading={loading || dataLoading}
                    valueClassName="text-purple-600 dark:text-purple-500"
                />
            </div>

            {/* Additional Metrics */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ARR</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                            {isBalanceHidden ? '****' : formatCurrency(metrics.arr)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ingresos recurrentes anuales
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics.activeServices}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            De {metrics.totalServices} totales
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isBalanceHidden ? '****' : formatCurrency(metrics.averageServiceValue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Por servicio activo
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Client Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5" />
                            Distribución de Clientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.totalClients > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={clientStatusData}
                                            dataKey="count"
                                            nameKey="status"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(entry) => `${entry.status}: ${entry.count}`}
                                        >
                                            {clientStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4 space-y-2">
                                    {clientStatusData.map((item) => (
                                        <div key={item.status} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span>{item.status}</span>
                                            </div>
                                            <span className="font-semibold">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No hay clientes registrados
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Project Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Proyectos por Estado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {projectStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={projectStatusData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="status" className="text-xs" />
                                    <YAxis className="text-xs" />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" name="Proyectos" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No hay proyectos registrados
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Clients by Revenue */}
            <Card>
                <CardHeader>
                    <CardTitle>Ingresos por Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                    {metrics.clientRevenue.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={metrics.clientRevenue} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" className="text-xs" tickFormatter={(value) => isBalanceHidden ? '' : formatCurrency(value)} />
                                    <YAxis type="category" dataKey="clientName" className="text-xs" width={120} />
                                    <Tooltip formatter={(value: number) => isBalanceHidden ? '****' : formatCurrency(value)} />
                                    <Bar dataKey="projectedRevenue" fill="#10b981" name="Ingresos Anuales (Est.)" />
                                </BarChart>
                            </ResponsiveContainer>

                            <div className="mt-6 overflow-hidden border rounded-md">
                                <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    <table className="w-full relative">
                                        <thead className="sticky top-0 bg-background z-10 shadow-sm">
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-4">Cliente</th>
                                                <th className="text-right py-2 px-4">Servicios Activos</th>
                                                <th className="text-right py-2 px-4">MRR</th>
                                                <th className="text-right py-2 px-4">Ingresos Anuales (Est.)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metrics.clientRevenue.map((client) => (
                                                <tr key={client.clientId} className="border-b">
                                                    <td className="py-2 px-4 font-medium">{client.clientName}</td>
                                                    <td className="py-2 px-4 text-right">{client.activeServices}</td>
                                                    <td className="py-2 px-4 text-right text-emerald-600 dark:text-emerald-500">
                                                        {isBalanceHidden ? '****' : formatCurrency(client.mrr)}
                                                    </td>
                                                    <td className="py-2 px-4 text-right font-semibold">
                                                        {isBalanceHidden ? '****' : formatCurrency(client.projectedRevenue)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No hay datos de ingresos por cliente
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Project Metrics Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Resumen de Proyectos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">Total Proyectos</p>
                            <p className="text-2xl font-bold mt-1">{metrics.projectMetrics.total}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">Tasa de Completitud</p>
                            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-500">
                                {metrics.projectMetrics.completionRate.toFixed(1)}%
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">Proyectos Vencidos</p>
                            <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-500">
                                {metrics.projectMetrics.overdue}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">Completados</p>
                            <p className="text-2xl font-bold mt-1">
                                {metrics.projectMetrics.byStatus['completed'] || 0}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
