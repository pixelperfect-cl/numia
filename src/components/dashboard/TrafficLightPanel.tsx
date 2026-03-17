
import { StatusIndicator, StatusType } from './StatusIndicator';
import { formatCurrency } from '@/lib/utils';
import { Wallet, Briefcase, AlertOctagon } from 'lucide-react';
import type { Subscription } from '@/types';

interface TrafficLightPanelProps {
    // Financial Data
    balance: number;
    monthlyExpenses: number;

    // Operational Data
    activeProjects: number;
    projectsAtRisk: number; // e.g. past due or no activity

    // Collections Data
    pendingCollections: number;
    overdueAmount: number;

    isBalanceHidden: boolean;
}

export function TrafficLightPanel({
    balance,
    monthlyExpenses,
    activeProjects,
    projectsAtRisk,
    pendingCollections,
    overdueAmount,
    isBalanceHidden
}: TrafficLightPanelProps) {

    // Logic for Financial Status
    // Healthy: Balance > 1 month of expenses
    // Warning: Balance < 1 month expenses but positive
    // Critical: Negative balance
    let financialStatus: StatusType = 'healthy';
    let financialDesc = 'Solvencia saludable';

    if (balance < 0) {
        financialStatus = 'critical';
        financialDesc = 'Balance negativo';
    } else if (monthlyExpenses > 0 && balance < monthlyExpenses) {
        financialStatus = 'warning';
        financialDesc = 'Menos de 1 mes de cobertura';
    }

    // Logic for Operational Status
    // Healthy: No projects at risk
    // Warning: 1-2 projects at risk
    // Critical: 3+ projects at risk
    let operationalStatus: StatusType = 'healthy';
    let operationalDesc = 'Operaciones en curso';

    if (projectsAtRisk >= 3) {
        operationalStatus = 'critical';
        operationalDesc = `${projectsAtRisk} proyectos requieren atención`;
    } else if (projectsAtRisk > 0) {
        operationalStatus = 'warning';
        operationalDesc = `${projectsAtRisk} proyectos con retraso`;
    }

    // Logic for Collections Status
    // Healthy: No overdue amount
    // Warning: Overdue exists but not critical (e.g. less than 500k or just 1 client) - Simplified
    // Critical: Overdue amount > 0 (Strict policy) or high amount
    let collectionStatus: StatusType = 'healthy';
    let collectionDesc = 'Cobranza al día';

    if (overdueAmount > 0) {
        // Let's be strict
        collectionStatus = 'critical';
        collectionDesc = 'Pagos vencidos detectados';
    } else if (pendingCollections > 0) {
        // Just pending for next 7 days doesn't mean warning, it's normal business.
        // Maybe warning if pending > expected? Leaving as healthy if not overdue.
        collectionStatus = 'healthy';
        collectionDesc = 'Cobros próximos en agenda';
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <StatusIndicator
                title="Salud Financiera"
                metric={isBalanceHidden ? '****' : formatCurrency(balance)}
                description={financialDesc}
                status={financialStatus}
                icon={Wallet}
            />
            <StatusIndicator
                title="Estado Operativo"
                metric={`${activeProjects} Activos`}
                description={operationalDesc}
                status={operationalStatus}
                icon={Briefcase}
            />
            <StatusIndicator
                title="Cobranza"
                metric={isBalanceHidden ? '****' : (overdueAmount > 0 ? formatCurrency(overdueAmount) : formatCurrency(pendingCollections))}
                description={overdueAmount > 0 ? 'Monto Vencido' : 'Por cobrar (7 días)'}
                status={collectionStatus}
                icon={AlertOctagon}
            />
        </div>
    );
}
