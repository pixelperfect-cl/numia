"use client"

import { LabelList, RadialBar, RadialBarChart } from "recharts"
import { useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import { Subscription } from "@/types"
import { useIndicators } from "@/hooks/useIndicators"

import {
    Card,
    CardContent,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    type ChartConfig,
} from "@/components/ui/chart"

export const description = "A radial chart with a label"

// Config for colors and labels
const chartConfig = {
    anual: {
        label: "Anual",
        color: "hsl(262.1 83.3% 57.8%)", // Violet 500
    },
    mensual: {
        label: "Mensual",
        color: "hsl(244.5 57.9% 50.6%)", // Indigo 600
    },
    semanal: {
        label: "Semanal",
        color: "hsl(221.2 83.2% 53.3%)", // Blue 600
    },
    diario: {
        label: "Diario",
        color: "hsl(199 89% 48%)", // Sky 500
    },
} satisfies ChartConfig

interface ServiceRevenueRadialChartProps {
    subscriptions: Subscription[];
}

export function ServiceRevenueRadialChart({ subscriptions }: ServiceRevenueRadialChartProps) {
    const { indicators } = useIndicators();
    const ufValue = indicators.find(i => i.codigo === 'uf')?.valor || 39730;

    const chartData = useMemo(() => {
        const activeSubs = subscriptions.filter(s => s.status === 'active');

        let monthlyTotal = 0;
        let yearlyTotal = 0;

        activeSubs.forEach(sub => {
            const amountCLP = sub.currency === 'UF' ? sub.amount * ufValue : sub.amount;
            if (sub.frequency === 'monthly') {
                monthlyTotal += amountCLP;
            } else {
                yearlyTotal += amountCLP;
            }
        });

        const totalAnnual = (monthlyTotal * 12) + yearlyTotal;
        const totalMonthly = totalAnnual / 12;
        const totalWeekly = totalAnnual / 52;
        const totalDaily = totalAnnual / 365;

        // Visual scales (descending to create concentric look)
        // Order: Diario (Inner) -> Anual (Outer)
        return [
            { name: "diario", label: "Diario", value: 30, realValue: totalDaily, fill: "var(--color-diario)" },
            { name: "semanal", label: "Semanal", value: 50, realValue: totalWeekly, fill: "var(--color-semanal)" },
            { name: "mensual", label: "Mensual", value: 75, realValue: totalMonthly, fill: "var(--color-mensual)" },
            { name: "anual", label: "Anual", value: 100, realValue: totalAnnual, fill: "var(--color-anual)" },
        ];
    }, [subscriptions, ufValue]);

    return (
        <Card className="flex flex-col h-full bg-card/50 border-0 shadow-none">
            {/* We hide the default Shadcn CardHeader as we have the bento title outside, 
                BUT the user might want the description or stats here. 
                Let's keep it minimal or use it for the big number. */}

            <CardContent className="flex-1 pb-0 flex items-center justify-center min-h-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square w-full h-[300px]" // Increased height slightly since footer is gone
                >
                    <RadialBarChart
                        data={chartData}
                        startAngle={200}
                        endAngle={-20}
                        innerRadius={30}
                        outerRadius={140}
                        barSize={24}
                    >
                        <ChartTooltip
                            cursor={false}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                        <div className="rounded-lg border bg-popover p-2 shadow-sm">
                                            <div className="flex gap-2 items-center">
                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                                <span className="text-muted-foreground capitalize">{item.label}</span>
                                            </div>
                                            <div className="mt-1 font-bold text-lg">
                                                {formatCurrency(item.realValue)}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <RadialBar dataKey="value" background cornerRadius={10}>
                            <LabelList
                                position="insideStart"
                                dataKey="label"
                                className="fill-white capitalize font-semibold opacity-90"
                                fontSize={10}
                            />
                        </RadialBar>
                    </RadialBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
