
import { useData } from '@/contexts/DataContext';

export function useLoanMetrics(selectedEntityId: string) {
    const { loans, loading } = useData();

    if (loading) return { loading: true, totalOwed: 0, totalLent: 0, pendingCount: 0 };

    const entityLoans = loans.filter(l => l.entityId === selectedEntityId);

    // Filter pending loans
    // Assuming 'amountPaid' and 'amount' are numeric. 
    // IsPaid deprecated check: use amountPaid >= amount.
    const pendingLoans = entityLoans.filter(l => l.amountPaid < l.amount);

    const totalOwed = pendingLoans
        .filter(l => l.type === 'owe')
        .reduce((sum, l) => sum + (l.amount - l.amountPaid), 0);

    const totalLent = pendingLoans
        .filter(l => l.type === 'lent')
        .reduce((sum, l) => sum + (l.amount - l.amountPaid), 0);

    return {
        loading: false,
        totalOwed,
        totalLent,
        pendingCount: pendingLoans.length
    };
}
