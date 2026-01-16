
import { useLocation, matchPath, Link } from 'react-router-dom';
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
    LayoutDashboard, FileBarChart, PieChart, ChevronRight, CheckSquare, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useEffect, useState } from 'react';
import { subscribeToProject } from '@/lib/firebase/database';
import type { Project } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';

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

    // Project Routes - Order matters: check specific project first
    const projectMatch = matchPath('/erp/projects/:projectId', path);
    if (projectMatch) return <SingleProjectHeaderContent projectId={projectMatch.params.projectId!} />;
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

// New Header for Single Project View
function SingleProjectHeaderContent({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState<any[]>([]); // ProjectList[]
    const { user } = useAuth(); // We need to import useAuth or get it from somewhere. ContextualHeader doesn't have it imported? check imports.

    useEffect(() => {
        if (projectId && user) {
            const unsubscribe = subscribeToProject(projectId, (p) => {
                setProject(p);
                setLoading(false);
            });
            // Fetch statuses
            import('@/lib/firebase/database').then(({ getProjectLists }) => {
                getProjectLists(user.uid).then(setStatuses);
            });

            return () => unsubscribe();
        }
    }, [projectId, user]);

    const handleStatusChange = async (newStatusId: string) => {
        if (!project) return;
        try {
            const { updateProject } = await import('@/lib/firebase/database');
            await updateProject(project.id, { status: newStatusId });
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const hasChecklists = project?.checklists && project.checklists.length > 0;
    const currentStatus = statuses.find(s => s.id === project?.status);

    return (
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-muted/40 backdrop-blur-sm border border-border/40 rounded-full transition-all hover:bg-muted/60 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 pr-4 border-r border-border/40">
                <Link to="/erp/projects" className="flex items-center gap-1 hover:text-foreground transition-colors group">
                    <SquareKanban className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground uppercase tracking-wide">Proyectos</span>
                </Link>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                    {loading ? '...' : project?.name}
                </span>

                {/* Status Dropdown */}
                {!loading && project && (
                    <>
                        <div className="h-3 w-px bg-border/50 mx-1" />
                        <StatusDropdown
                            currentStatusId={project.status}
                            statuses={statuses}
                            onChange={handleStatusChange}
                        />
                    </>
                )}
            </div>

            {loading ? (
                <div className="flex items-center gap-2 px-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="flex items-center gap-4 text-sm w-[200px]">
                    {hasChecklists ? (
                        <div className="flex-1 flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                <span className="flex items-center gap-1.5">
                                    <CheckSquare className="h-3 w-3" />
                                    Progreso
                                </span>
                                <span>{Math.round(project.progress)}%</span>
                            </div>
                            <Progress
                                value={project.progress}
                                className="h-1.5"
                                indicatorClassName="bg-[#008bff] shadow-[0_0_8px_#008bff]"
                            />
                        </div>
                    ) : (
                        <div className="text-xs text-muted-foreground italic pl-2">
                            Sin listas de tareas
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}



function StatusDropdown({ currentStatusId, statuses, onChange }: { currentStatusId: string, statuses: any[], onChange: (id: string) => void }) {
    const current = statuses.find(s => s.id === currentStatusId) || { title: currentStatusId, color: 'bg-gray-500' };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-background/50 transition-colors focus:outline-none">
                    <div className={cn("w-2 h-2 rounded-full", current.color?.split(' ')[0] || 'bg-slate-500')} />
                    <span className="text-xs font-medium text-foreground">{current.title}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[150px]">
                {statuses.map(status => (
                    <DropdownMenuItem
                        key={status.id}
                        onClick={() => onChange(status.id)}
                        className="flex items-center gap-2 text-xs"
                    >
                        <div className={cn("w-2 h-2 rounded-full", status.color?.split(' ')[0] || 'bg-slate-500')} />
                        {status.title}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
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
