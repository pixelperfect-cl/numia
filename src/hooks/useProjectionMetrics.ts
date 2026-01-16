
import { useData } from '@/contexts/DataContext';

export function useProjectionMetrics(selectedEntityId: string) {
    const { projections, loading } = useData();

    if (loading) return { loading: true, currentPeriodLabel: '', projectedIncome: 0, projectedExpense: 0, projectedBalance: 0 };

    const entityProjections = projections.filter(p => p.entityId === selectedEntityId);

    // Find current period projection (Monthly)
    // Format YYYY-MM
    const today = new Date();
    const currentPeriodKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Filter for monthly projections mostly, or find exact match
    const currentProjection = entityProjections.find(p => p.period === currentPeriodKey && p.periodType === 'monthly');

    // If no exact match, defaults to 0
    const projectedIncome = currentProjection?.totals?.totalIncome || 0;
    const projectedExpense = currentProjection?.totals?.totalExpenses || 0;
    const projectedBalance = currentProjection?.totals?.availableBalance || 0;
    const currentPeriodLabel = today.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

    return {
        loading: false,
        currentPeriodLabel,
        projectedIncome,
        projectedExpense,
        projectedBalance
    };
}
