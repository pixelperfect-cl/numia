
import { useData } from '@/contexts/DataContext';
import { calculateSummary, getTodayLocalDateString, parseLocalDate } from '@/lib/utils';

export function useFinancialMetrics(selectedEntityId: string) {
    const { movements, loading } = useData();

    if (loading) return { loading: true, currentBalance: 0, monthlyIncome: 0, monthlyExpense: 0, monthLabel: '' };

    const entityMovements = movements.filter(m => m.entityId === selectedEntityId);

    // Total Balance (All time)
    const summary = calculateSummary(entityMovements);
    const currentBalance = summary.balance;

    // Current Month Metrics
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = today.toLocaleDateString('es-CL', { month: 'long' });

    const currentMonthMovements = entityMovements.filter(m => {
        const date = parseLocalDate(m.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === currentMonthKey;
    });

    const monthSummary = calculateSummary(currentMonthMovements);

    return {
        loading: false,
        currentBalance,
        monthlyIncome: monthSummary.income,
        monthlyExpense: monthSummary.expenses,
        monthLabel
    };
}
