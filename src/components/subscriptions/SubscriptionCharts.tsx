import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { EntitySubscription } from '@/types';

interface SubscriptionChartsProps {
    entityId: string;
}

export function SubscriptionCharts({ entityId }: SubscriptionChartsProps) {
    const { entitySubscriptions, categories } = useData();

    // Filter active subscriptions
    const subscriptions = entitySubscriptions.filter(s => s.entityId === entityId && s.status === 'active');

    if (subscriptions.length === 0) return null;

    // Calculate Totals
    let totalMonthly = 0;
    let totalYearly = 0;

    // Group by Category
    const categoryData: Record<string, { name: string; value: number; color: string }> = {};

    subscriptions.forEach(sub => {
        // Normalize to monthly cost
        const monthlyCost = sub.billingCycle === 'monthly' ? sub.amount : sub.amount / 12;
        const yearlyCost = sub.billingCycle === 'yearly' ? sub.amount : sub.amount * 12;

        totalMonthly += monthlyCost;
        totalYearly += yearlyCost;

        const cat = categories.find(c => c.id === sub.categoryId);
        const catName = cat?.name || 'Varios';
        const catColor = cat?.color || '#9ca3af';

        if (!categoryData[catName]) {
            categoryData[catName] = { name: catName, value: 0, color: catColor };
        }
        categoryData[catName].value += monthlyCost; // Chart based on monthly impact
    });

    const pieData = Object.values(categoryData).sort((a, b) => b.value - a.value);

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gasto Mensual Estimado</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${Math.round(totalMonthly).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Promedio mensual basado en tus suscripciones
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Costo Anual Total</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${Math.round(totalYearly).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Proyección a 12 meses
                    </p>
                </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-1 md:row-span-2">
                <CardHeader>
                    <CardTitle>Distribución por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `$${Math.round(value).toLocaleString()}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
