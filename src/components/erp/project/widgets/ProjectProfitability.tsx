import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { Project } from '@/types';
import { Progress } from '@/components/ui/progress';

interface ProjectProfitabilityProps {
    project: Project;
    income: number;
    expenses: number;
}

export function ProjectProfitability({ project, income, expenses }: ProjectProfitabilityProps) {
    const profit = income - expenses;
    const margin = income > 0 ? (profit / income) * 100 : 0;
    const projectValue = project.amount || 0;

    // Budget health (Expenses vs Budgeted/Contract Value)
    // If we assume project.amount is the 'Budget' (price sold), then expenses eating into it reduces margin.
    const expenseRatio = projectValue > 0 ? (expenses / projectValue) * 100 : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Margen Neto</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${profit.toLocaleString('es-CL')}
                    </div>
                    <p className={`text-xs ${margin > 0 ? 'text-emerald-500' : 'text-red-500'} flex items-center mt-1`}>
                        {margin > 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                        {margin.toFixed(1)}% Margen
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${income.toLocaleString('es-CL')}
                    </div>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Cobrado</span>
                            <span>{projectValue > 0 ? Math.round((income / projectValue) * 100) : 0}% del contrato</span>
                        </div>
                        <Progress value={projectValue > 0 ? (income / projectValue) * 100 : 0} className="h-1.5" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        ${expenses.toLocaleString('es-CL')}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Costos directos asociados
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${projectValue.toLocaleString('es-CL')}
                    </div>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Consumido (Gastos)</span>
                            <span>{Math.round(expenseRatio)}%</span>
                        </div>
                        <Progress value={expenseRatio} className="h-1.5 bg-secondary" indicatorClassName="bg-red-400" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
