
import { useLocation } from 'react-router-dom';
import { useServiceMetrics } from '@/hooks/useServiceMetrics';
import { useClientMetrics } from '@/hooks/useClientMetrics';
import { useProjectMetrics } from '@/hooks/useProjectMetrics';
import { useFinancialMetrics } from '@/hooks/useFinancialMetrics';
import { useLoanMetrics } from '@/hooks/useLoanMetrics';
import { useProjectionMetrics } from '@/hooks/useProjectionMetrics';
import { useSubscriptionMetrics } from '@/hooks/useSubscriptionMetrics';
import { useERPDashboardMetrics } from '@/hooks/useERPDashboardMetrics';
import {
    TrendingUp, TrendingDown, DollarSign, Loader2, Briefcase, Users, UserCheck,
    UserX, SquareKanban, Archive, Activity, Wallet, HandCoins, PiggyBank, Receipt,
    LayoutDashboard, FileBarChart, PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface ContextualHeaderProps {
    selectedEntityId: string;
}

export function ContextualHeader({ selectedEntityId }: ContextualHeaderProps) {
    const location = useLocation();
    const path = location.pathname;

    // ERP Routes
    if (path === '/erp/dashboard') return <ERPDashboardHeaderContent selectedEntityId={selectedEntityId} />;
    if (path.startsWith('/erp/services')) return <ServicesHeaderContent selectedEntityId={selectedEntityId} />;
    if (path.startsWith('/erp/clients')) return <ClientsHeaderContent selectedEntityId={selectedEntityId} />;
    if (path.startsWith('/erp/projects')) return <ProjectsHeaderContent selectedEntityId={selectedEntityId} />;

    // Reports Routes
    if (path.startsWith('/reports/financial')) return <FinancialReportHeaderContent selectedEntityId={selectedEntityId} />;
    if (path.startsWith('/reports/erp')) return <ERPReportHeaderContent selectedEntityId={selectedEntityId} />;

    // Main Routes
    if (path === '/dashboard') return <DashboardHeaderContent selectedEntityId={selectedEntityId} />;
    if (path === '/movements') return <MovementsHeaderContent selectedEntityId={selectedEntityId} />;
    if (path === '/loans') return <LoansHeaderContent selectedEntityId={selectedEntityId} />;
    if (path === '/projections') return <ProjectionsHeaderContent selectedEntityId={selectedEntityId} />;
    if (path === '/subscriptions') return <SubscriptionsHeaderContent selectedEntityId={selectedEntityId} />;

    return null;
}

// --- Content Components ---

function ERPDashboardHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { mrr, activeClients, pendingCollections, loading } = useERPDashboardMetrics(selectedEntityId);
    const { isBalanceHidden } = usePrivacy();

    return (
        <HeaderPill label="Dashboard ERP" icon={LayoutDashboard} loading={loading}>
            <MetricItem icon={DollarSign} color="text-emerald-500" label="MRR" value={mrr} isCurrency isHidden={isBalanceHidden} />
            <MetricItem icon={Users} color="text-blue-500" label="Clientes" value={activeClients} />
            <MetricItem icon={Activity} color="text-purple-500" label="Por Cobrar (7d)" value={pendingCollections} isCurrency isHidden={isBalanceHidden} />
        </HeaderPill>
    );
}

function FinancialReportHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { currentBalance, monthlyIncome, loading } = useFinancialMetrics(selectedEntityId);
    const { isBalanceHidden } = usePrivacy();

    return (
        <HeaderPill label="Reporte Financiero" icon={PieChart} loading={loading}>
            <MetricItem icon={Wallet} color="text-blue-500" label="Balance Actual" value={currentBalance} isCurrency isHidden={isBalanceHidden} />
            <MetricItem icon={TrendingUp} color="text-emerald-500" label="Ingreso Mes" value={monthlyIncome} isCurrency isHidden={isBalanceHidden} />
        </HeaderPill>
    );
}

function ERPReportHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { mrr, activeClients, loading } = useERPDashboardMetrics(selectedEntityId);
    const { isBalanceHidden } = usePrivacy();

    return (
        <HeaderPill label="Reporte Gestión" icon={FileBarChart} loading={loading}>
            <MetricItem icon={DollarSign} color="text-emerald-500" label="MRR Total" value={mrr} isCurrency isHidden={isBalanceHidden} />
            <MetricItem icon={Users} color="text-blue-500" label="Clientes Activos" value={activeClients} />
        </HeaderPill>
    );
}

function ServicesHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { monthlyAverage, totalAnnual, loading } = useServiceMetrics(selectedEntityId);
    return (
        <HeaderPill label="Servicios" icon={Briefcase} loading={loading}>
            <MetricItem icon={TrendingUp} color="text-emerald-500" label="Mensual" value={monthlyAverage} isCurrency />
            <MetricItem icon={DollarSign} color="text-blue-500" label="Anual" value={totalAnnual} isCurrency />
        </HeaderPill>
    );
}

function ClientsHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { total, active, inactive, loading } = useClientMetrics(selectedEntityId);
    return (
        <HeaderPill label="Clientes" icon={Users} loading={loading}>
            <MetricItem icon={Users} color="text-blue-500" label="Total" value={total} />
            <MetricItem icon={UserCheck} color="text-emerald-500" label="Activos" value={active} />
            <MetricItem icon={UserX} color="text-muted-foreground/50" label="Inactivos" value={inactive} />
        </HeaderPill>
    );
}

function ProjectsHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { active, archived, loading } = useProjectMetrics(selectedEntityId);
    return (
        <HeaderPill label="Proyectos" icon={SquareKanban} loading={loading}>
            <MetricItem icon={Activity} color="text-emerald-500" label="Activos" value={active} />
            <MetricItem icon={Archive} color="text-amber-500" label="Archivados" value={archived} />
        </HeaderPill>
    );
}

function DashboardHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { currentBalance, monthlyIncome, monthlyExpense, loading } = useFinancialMetrics(selectedEntityId);
    const { isBalanceHidden } = usePrivacy();

    return (
        <HeaderPill label="Finanzas" icon={Wallet} loading={loading}>
            <MetricItem icon={DollarSign} color="text-blue-500" label="Balance" value={currentBalance} isCurrency isHidden={isBalanceHidden} />
            <div className="mx-2 h-4 w-px bg-border/50 hidden lg:block" />
            <MetricItem icon={TrendingUp} color="text-emerald-500" label="Ingreso Mes" value={monthlyIncome} isCurrency isHidden={isBalanceHidden} />
            <MetricItem icon={TrendingDown} color="text-red-500" label="Gasto Mes" value={monthlyExpense} isCurrency isHidden={isBalanceHidden} />
        </HeaderPill>
    );
}

function MovementsHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { monthlyIncome, monthlyExpense, monthLabel, loading } = useFinancialMetrics(selectedEntityId);
    const { isBalanceHidden } = usePrivacy();

    return (
        <HeaderPill label={`Flujo ${monthLabel}`} icon={Activity} loading={loading}>
            <MetricItem icon={TrendingUp} color="text-emerald-500" label="Ingresos" value={monthlyIncome} isCurrency isHidden={isBalanceHidden} />
            <MetricItem icon={TrendingDown} color="text-red-500" label="Gastos" value={monthlyExpense} isCurrency isHidden={isBalanceHidden} />
        </HeaderPill>
    );
}

function LoansHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { totalOwed, totalLent, pendingCount, loading } = useLoanMetrics(selectedEntityId);
    const { isBalanceHidden } = usePrivacy();

    return (
        <HeaderPill label="Deudas" icon={HandCoins} loading={loading}>
            <MetricItem icon={TrendingDown} color="text-red-500" label="Por Pagar" value={totalOwed} isCurrency isHidden={isBalanceHidden} />
            <MetricItem icon={TrendingUp} color="text-emerald-500" label="Por Cobrar" value={totalLent} isCurrency isHidden={isBalanceHidden} />
            <MetricItem icon={Activity} color="text-blue-500" label="Pendientes" value={pendingCount} />
        </HeaderPill>
    );
}

function ProjectionsHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { projectedBalance, currentPeriodLabel, loading } = useProjectionMetrics(selectedEntityId);
    const { isBalanceHidden } = usePrivacy();

    return (
        <HeaderPill label="Proyección" icon={PiggyBank} loading={loading}>
            <span className="text-[10px] text-muted-foreground mr-1 hidden xl:inline uppercase">{currentPeriodLabel}:</span>
            <MetricItem icon={DollarSign} color={projectedBalance >= 0 ? "text-blue-500" : "text-red-500"} label="Balance Proyectado" value={projectedBalance} isCurrency isHidden={isBalanceHidden} />
        </HeaderPill>
    );
}

function SubscriptionsHeaderContent({ selectedEntityId }: { selectedEntityId: string }) {
    const { monthlyTotal, yearlyTotal, loading } = useSubscriptionMetrics(selectedEntityId);
    const { isBalanceHidden } = usePrivacy();

    return (
        <HeaderPill label="Gastos Fijos" icon={Receipt} loading={loading}>
            <MetricItem icon={TrendingDown} color="text-red-500" label="Mensual" value={monthlyTotal} isCurrency isHidden={isBalanceHidden} />
            <MetricItem icon={TrendingDown} color="text-orange-500" label="Anual" value={yearlyTotal} isCurrency isHidden={isBalanceHidden} />
        </HeaderPill>
    );
}

// --- Helper Components ---

function HeaderPill({ label, icon: Icon, loading, children }: { label: string, icon: any, loading: boolean, children: React.ReactNode }) {
    return (
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-muted/40 backdrop-blur-sm border border-border/40 rounded-full transition-all hover:bg-muted/60 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 pr-4 border-r border-border/40">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 px-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Cargando...</span>
                </div>
            ) : (
                <div className="flex items-center gap-4 text-sm">
                    {children}
                </div>
            )}
        </div>
    );
}

function MetricItem({ icon: Icon, color, label, value, isCurrency = false, isHidden = false }: { icon: any, color: string, label: string, value: number, isCurrency?: boolean, isHidden?: boolean }) {
    const formattedValue = isHidden
        ? '****'
        : isCurrency
            ? `$${Math.round(value).toLocaleString('es-CL')}`
            : value;

    return (
        <div className="flex items-center gap-1.5" title={label}>
            <Icon className={cn("h-3.5 w-3.5", color)} />
            <span className="text-xs text-muted-foreground hidden lg:inline">{label}:</span>
            <span className="font-semibold text-foreground tracking-tight">{formattedValue}</span>
        </div>
    );
}
