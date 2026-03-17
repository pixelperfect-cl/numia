
import { useLocation, matchPath, Link, useSearchParams } from 'react-router-dom';
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
    LayoutDashboard, FileBarChart, PieChart, ChevronRight, CheckSquare, ChevronDown, Search, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useEffect, useState } from 'react';
import { subscribeToProject } from '@/lib/supabase/database';
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

// --- Header Date Selector ---
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '@/contexts/DataContext';
import { DateFilterType, DateFilter } from '@/types';

function HeaderDateSelector() {
    const { dateFilter, setDateFilter } = useData();
    const [isOpen, setIsOpen] = useState(false);

    const periodOptions: { value: DateFilterType | 'ALL'; label: string }[] = [
        { value: 'TODAY', label: 'Hoy' },
        { value: 'THIS_WEEK', label: 'Esta Semana' },
        { value: 'LAST_WEEK', label: 'Semana Pasada' },
        { value: 'THIS_MONTH', label: 'Este Mes' },
        { value: 'LAST_MONTH', label: 'Mes Pasado' },
        { value: 'THIS_YEAR', label: 'Este Año' },
        { value: 'LAST_YEAR', label: 'Año Pasado' },
        { value: 'ALL', label: 'Todo' }, // Added for 'All time'
        { value: 'CUSTOM', label: 'Personalizado' },
    ];

    return (
        <div className="flex items-center gap-2">
            <Select
                value={dateFilter.type}
                onValueChange={(val: DateFilterType | 'ALL') => {
                    if (val === 'CUSTOM') {
                        // Keep custom open or handle logic needed?
                        // Usually we switch mode and let user pick dates
                        setDateFilter({ type: 'CUSTOM', startDate: undefined, endDate: undefined });
                    } else {
                        setDateFilter({ type: val });
                    }
                }}
            >
                <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/40 border-border/40">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {periodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {dateFilter.type === 'CUSTOM' && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-8 text-xs font-normal", !dateFilter.startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {dateFilter.startDate ? (
                                dateFilter.endDate ? (
                                    <>
                                        {format(new Date(dateFilter.startDate), "dd/MM/yy")} -{" "}
                                        {format(new Date(dateFilter.endDate), "dd/MM/yy")}
                                    </>
                                ) : (
                                    format(new Date(dateFilter.startDate), "dd/MM/yy")
                                )
                            ) : (
                                <span>Seleccionar fechas</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateFilter.startDate ? new Date(dateFilter.startDate) : new Date()}
                            selected={{
                                from: dateFilter.startDate ? new Date(dateFilter.startDate) : undefined,
                                to: dateFilter.endDate ? new Date(dateFilter.endDate) : undefined,
                            }}
                            onSelect={(range) => {
                                if (range?.from) {
                                    setDateFilter({
                                        type: 'CUSTOM',
                                        startDate: range.from.toISOString().split('T')[0],
                                        endDate: range.to ? range.to.toISOString().split('T')[0] : undefined
                                    });
                                } else {
                                    // Clear
                                    setDateFilter({ type: 'CUSTOM', startDate: undefined, endDate: undefined });
                                }
                            }}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}

// Update wrapper to include selector
function HeaderPill({ label, icon: Icon, loading, children }: { label: string, icon: any, loading: boolean, children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4">
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

            {/* Inject Date Selector globally here for specific pages */}
            <HeaderDateWrapper />
        </div>
    );
}

// Helper to decide when to show the date selector
function HeaderDateWrapper() {
    const location = useLocation();
    // Show on Dashboard and Movements and Reports
    const showDateSelector = ['/movements', '/reports'].some(p => location.pathname.startsWith(p));
    // Also explicitly disable if we are in active services (since we added a custom search input there, maybe date selector is too much clutter? OR keep it?)
    // The requirement didn't specify removing date selector, but typically 'Active services' is not date filtered?
    // Actually Contextual Header already handles what to show. Sticky header usually shows global date selector.
    // Let's keep it unless conflict. 
    // Wait, the ServicesHeaderContent wraps everything in a div now, but HeaderPill calls HeaderDateWrapper via injection.
    // If ServicesHeaderContent returns a div wrapper, HeaderPill inside it will inject DateWrapper. 
    // IF I wrap HeaderPill, I need to be careful. ContextualHeader returns ServicesHeaderContent directly.
    // So if ServicesHeaderContent returns <div ...> <HeaderPill ... /> ... </div>, 
    // Then HeaderPill is a child. 
    // HeaderPill renders children (metrics) inside itself, AND HeaderDateWrapper after itself.

    // My change to ServicesHeaderContent wraps HeaderPill and Search in a div. 
    // Does HeaderPill render itself OK? Yes.
    // Will HeaderDateWrapper still render? Yes, inside HeaderPill's return. 
    // But Services page usually doesn't show date selector based on line 197 logic. 
    // line 197: ['/dashboard', '/movements', '/reports'].some...
    // '/erp/services' is NOT in that list. So date selector won't show on services page anyway. Correct.

    if (!showDateSelector) return null;

    return <HeaderDateSelector />;
}

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
    const [searchParams, setSearchParams] = useSearchParams();
    const currentSearch = searchParams.get('search') || '';

    const handleSearch = (term: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (term) {
                newParams.set('search', term);
            } else {
                newParams.delete('search');
            }
            return newParams;
        });
    };

    return (
        <div className="flex items-center gap-4">
            <HeaderPill label="Servicios" icon={Briefcase} loading={loading}>
                <MetricItem icon={TrendingUp} color="text-emerald-500" label="Mensual" value={monthlyAverage} isCurrency />
                <MetricItem icon={DollarSign} color="text-blue-500" label="Anual" value={totalAnnual} isCurrency />
                <MetricItem icon={Activity} color="text-purple-500" label="Diario" value={totalAnnual / 365} isCurrency />
            </HeaderPill>

            <div className="relative w-48 md:w-64 hidden sm:block">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar clientes..."
                    value={currentSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 text-xs bg-muted/40 border border-border/40 rounded-full focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground/50"
                />
            </div>
        </div>
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
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (projectId && user) {
            const unsubscribe = subscribeToProject(projectId, (p) => {
                setProject(p);
                setLoading(false);
            });
            // Fetch statuses
            import('@/lib/supabase/database').then(({ getProjectLists }) => {
                getProjectLists(user.uid).then(setStatuses);
            });

            return () => unsubscribe();
        }
    }, [projectId, user]);

    const handleStatusChange = async (newStatusId: string) => {
        if (!project) return;

        // Optimistic Update
        const previousProject = { ...project };
        setProject({ ...project, status: newStatusId });

        try {
            const { updateProject } = await import('@/lib/supabase/database');
            await updateProject(project.id, { status: newStatusId });
        } catch (error) {
            console.error("Failed to update status", error);
            // Revert on failure
            setProject(previousProject);
            // Optional: Show toast error here
        }
    };

    // Time Progress Logic
    const calculateTimeProgress = () => {
        if (!project?.createdAt || !project?.dueDate) return 0;
        const start = new Date(project.createdAt);
        const end = new Date(project.dueDate);
        const now = new Date();
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();

        if (totalDuration <= 0) return 100;

        const progress = (elapsed / totalDuration) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

    const timeProgress = calculateTimeProgress();
    const isOverdue = project?.dueDate && new Date() > new Date(project.dueDate) && timeProgress >= 100;

    // Format dates for tooltip or display if needed
    // const timeLeft = ...

    return (
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-muted/40 backdrop-blur-sm border border-border/40 rounded-full transition-all hover:bg-muted/60 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 pr-4 border-r border-border/40">
                <Link to="/erp/projects" className="flex items-center gap-1 hover:text-foreground transition-colors group">
                    <SquareKanban className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground uppercase tracking-wide">Proyectos</span>
                </Link>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-xs font-semibold text-foreground truncate max-w-[150px]" title={project?.name}>
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
                <div className="flex items-center gap-4 text-sm w-[240px]">
                    {project?.createdAt && project?.dueDate ? (
                        <div className="flex-1 flex flex-col gap-1 w-full" title={`Inicio: ${format(new Date(project.createdAt), 'dd/MM')} - Fin: ${format(new Date(project.dueDate), 'dd/MM')}`}>
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    Tiempo
                                </span>
                                <span className={cn(isOverdue ? "text-destructive font-bold" : "")}>
                                    {Math.round(timeProgress)}%
                                </span>
                            </div>
                            <Progress
                                value={timeProgress}
                                className="h-1.5"
                                indicatorClassName={cn(
                                    "transition-all duration-500",
                                    isOverdue ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                )}
                            />
                        </div>
                    ) : (
                        <div className="text-xs text-muted-foreground italic pl-2">
                            Sin fechas definidas
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
