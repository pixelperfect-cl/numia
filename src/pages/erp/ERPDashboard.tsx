import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getClients, getProjects, getSubscriptions } from '@/lib/firebase/database';
import { Users, Briefcase, DollarSign, Activity } from 'lucide-react';
import type { Client, Project } from '@/types';

export function ERPDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        mrr: 0,
        activeClients: 0,
        activeProjects: 0,
        totalProjects: 0
    });

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        try {
            if (!user) return;
            setLoading(true);

            const [clientsData, projectsData] = await Promise.all([
                getClients(user.uid),
                getProjects(user.uid)
            ]);

            // Calculate Active Clients & Projects
            const activeClientsCount = clientsData.filter(c => c.status === 'active').length;
            const activeProjectsCount = projectsData.filter(p => p.status !== 'completed').length;

            // Calculate MRR
            let totalMrr = 0;
            // Fetch subscriptions for all clients concurrently
            await Promise.all(clientsData.map(async (client) => {
                const subs = await getSubscriptions(client.id, user.uid);
                const clientMrr = subs.reduce((sum, sub) => {
                    // Only count if status is active (if we had status on sub, assuming yes or just all for now)
                    // If frequency is yearly, divide by 12? For now assume monthly or simple sum 
                    // and maybe simple heuristic: if yearly, count 1/12.
                    let amount = Number(sub.amount) || 0;
                    if (sub.frequency === 'yearly') {
                        amount = amount / 12;
                    }
                    return sum + amount;
                }, 0);
                totalMrr += clientMrr;
            }));

            setMetrics({
                mrr: totalMrr,
                activeClients: activeClientsCount,
                activeProjects: activeProjectsCount,
                totalProjects: projectsData.length
            });

        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        {
            title: "MRR Estimado",
            value: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(metrics.mrr),
            description: "Ingresos recurrentes mensuales",
            icon: DollarSign,
            className: "text-emerald-500"
        },
        {
            title: "Clientes Activos",
            value: metrics.activeClients,
            description: "En cartera",
            icon: Users,
            className: "text-blue-500"
        },
        {
            title: "Proyectos en Curso",
            value: metrics.activeProjects,
            description: `De ${metrics.totalProjects} totales`,
            icon: Briefcase,
            className: "text-amber-500"
        },
        {
            title: "Cobros Pendientes",
            value: "$0",
            description: "Próximos 7 días (Simulado)",
            icon: Activity,
            className: "text-purple-500"
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
                <p className="text-muted-foreground">Resumen general de tu agencia</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
                            <card.icon className={`h-4 w-4 ${card.className}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? "..." : card.value}</div>
                            <p className="text-xs text-muted-foreground">
                                {card.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Placeholder for future charts or lists */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No hay actividad reciente registrada.</p>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Próximos Vencimientos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No hay vencimientos próximos.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
