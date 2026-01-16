import { useMemo, useRef, useState } from 'react';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, Plus, MoreHorizontal, Archive, Trash2, Edit, CheckCircle2, CircleDollarSign, RotateCcw, Receipt, History, Globe, Briefcase, LayoutGrid, CalendarRange } from 'lucide-react';
import { format, parseISO, getMonth, isPast, isToday, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import type { EnhancedSubscription } from '@/pages/erp/Services';

interface ServiceKanbanBoardProps {
    subscriptions: EnhancedSubscription[];
    onEdit: (sub: EnhancedSubscription) => void;
    onCreate: (context: { frequency: 'monthly' | 'yearly'; monthIndex: number }) => void;
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
    ufValue: number | null;
    onMarkPaid: (sub: EnhancedSubscription) => void;
    onPartialPayment: (sub: EnhancedSubscription) => void;
    onRevertPayment: (sub: EnhancedSubscription) => void;
    onViewPaymentDetails: (sub: EnhancedSubscription) => void;
    onShowHistory: (sub: EnhancedSubscription) => void;
    onViewClient: (sub: EnhancedSubscription) => void;
    mode: 'monthly' | 'annual';
}

const months = [
    'General', // For monthly subscriptions
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getLabelColor = (name: string) => {
    const colors = [
        'bg-emerald-500',
        'bg-blue-500',
        'bg-purple-500',
        'bg-rose-500',
        'bg-amber-500',
        'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export function ServiceKanbanBoard({
    subscriptions,
    onEdit,
    onCreate,
    onArchive,
    onDelete,
    ufValue,
    onMarkPaid,
    onPartialPayment,
    onRevertPayment,
    onViewPaymentDetails,
    onShowHistory,
    onViewClient,
    mode
}: ServiceKanbanBoardProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const { isBalanceHidden } = usePrivacy();


    const columns = useMemo(() => {
        const cols: Record<number, EnhancedSubscription[]> = {};
        for (let i = 0; i <= 12; i++) cols[i] = [];

        subscriptions.forEach(sub => {
            if (sub.status !== 'active') return;

            if (sub.frequency === 'monthly') {
                cols[0].push(sub);
            } else if (sub.frequency === 'yearly') {
                try {
                    const date = parseISO(sub.nextBillingDate);
                    const monthIndex = getMonth(date) + 1; // 1-12
                    cols[monthIndex].push(sub);
                } catch (e) {
                    console.error("Invalid date for sub", sub);
                }
            }
        });

        return cols;
    }, [subscriptions]);

    const calculateColumnStats = (subs: EnhancedSubscription[]) => {
        let rawCLP = 0;
        let rawUF = 0;

        subs.forEach(sub => {
            if (sub.currency === 'UF') {
                rawUF += sub.amount;
            } else {
                rawCLP += sub.amount;
            }
        });

        const convertedUFtoCLP = ufValue ? rawUF * ufValue : 0;
        const convertedCLPtoUF = ufValue ? rawCLP / ufValue : 0;

        const totalCLP_Estimated = rawCLP + convertedUFtoCLP;
        const totalUF_Estimated = rawUF + convertedCLPtoUF;

        return { rawCLP, rawUF, totalCLP_Estimated, totalUF_Estimated };
    };

    const renderCard = (sub: EnhancedSubscription) => {
        const date = parseISO(sub.nextBillingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isOverdue = isPast(date) && !isToday(date);
        const daysUntilDue = differenceInDays(date, today);
        const paidAmount = sub.paidAmount || 0;
        let totalAmount = sub.amount;
        if (sub.currency === 'UF' && ufValue) totalAmount = Math.round(sub.amount * ufValue);

        const isFullyPaidByAmount = totalAmount > 0 && paidAmount >= (totalAmount - 10);
        const isPaidStatus = isFullyPaidByAmount || daysUntilDue > 15;

        const displayValue = () => {
            if (sub.currency === 'UF') {
                const clpValue = ufValue ? Math.round(sub.amount * ufValue) : 0;
                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-semibold text-sm">{isBalanceHidden ? '****' : `UF ${sub.amount}`}</span>
                        {ufValue && <span className="text-[10px] text-muted-foreground">{isBalanceHidden ? '****' : formatCurrency(clpValue)}</span>}
                    </div>
                );
            } else {
                const ufEquivalent = ufValue ? (sub.amount / ufValue).toFixed(2) : 0;
                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-semibold text-sm">{isBalanceHidden ? '****' : formatCurrency(sub.amount)}</span>
                        {ufValue && <span className="text-[10px] text-muted-foreground">{isBalanceHidden ? '****' : `UF ${ufEquivalent}`}</span>}
                    </div>
                );
            }
        };

        const paidCLP = sub.paidAmount || 0;
        let targetCLP = sub.amount;
        if (sub.currency === 'UF' && ufValue) {
            targetCLP = Math.round(sub.amount * ufValue);
        }

        const progress = targetCLP > 0 ? Math.min(100, (paidCLP / targetCLP) * 100) : 0;
        const isFullyPaid = targetCLP > 0 && paidCLP >= (targetCLP - 10);

        return (
            <div
                key={sub.id}
                onClick={(e) => {
                    if (isDragging) {
                        e.stopPropagation();
                        return;
                    }
                    onEdit(sub);
                }}
                className={cn(
                    "group relative flex flex-col gap-1 rounded-lg bg-white dark:bg-zinc-800 p-3 shadow-sm border border-zinc-200 dark:border-white/5 transition-all hover:shadow-md cursor-pointer",
                    mode === 'monthly' ? "h-full" : "h-auto"
                )}
            >
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-600 focus:ring-0 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                        title="Ver historial de abonos"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowHistory(sub);
                        }}
                    >
                        <History className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-600 focus:ring-0" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(sub); }}>
                                <Edit className="mr-2 h-4 w-4" /> Editar Servicio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewClient(sub); }}>
                                <Briefcase className="mr-2 h-4 w-4" /> Ver Cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShowHistory(sub); }}>
                                <Receipt className="mr-2 h-4 w-4" /> Ver Historial
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPartialPayment(sub); }}>
                                <CircleDollarSign className="mr-2 h-4 w-4" /> Abonar parte
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRevertPayment(sub); }}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Deshacer último pago
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(sub.id); }}>
                                <Archive className="mr-2 h-4 w-4" /> Archivar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(sub.id); }} className="text-red-500 focus:text-red-500">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className={cn("h-1 w-6 rounded-full mb-2", getLabelColor(sub.name))} />

                <div className="flex justify-between items-start mb-1">
                    <div
                        className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate pr-8 leading-tight hover:text-blue-500 hover:underline cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewClient(sub);
                        }}
                        title="Ver cliente"
                    >
                        {sub.clientName}
                    </div>
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mb-2">
                    {sub.name}
                </div>

                {sub.clientWebsite && (
                    <a
                        href={sub.clientWebsite.startsWith('http') ? sub.clientWebsite : `https://${sub.clientWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-blue-500 transition-colors mb-3 w-fit"
                    >
                        <Globe className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[150px]">{sub.clientWebsite.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                    </a>
                )}

                <div className="mt-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div className={cn(
                            "flex items-center gap-1 w-fit rounded-sm px-1.5 py-0.5 text-[10px] font-medium border",
                            isOverdue
                                ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 border-red-100 dark:border-red-900/50"
                                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-100 dark:border-zinc-700"
                        )}>
                            <Clock className="h-3 w-3" />
                            <span>
                                {format(date, "d MMM yyyy", { locale: es })}
                            </span>
                        </div>

                        <div className="text-right">
                            {displayValue()}
                        </div>
                    </div>

                    {progress > 0 && progress < 100 && (
                        <div className="mb-2 space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-zinc-500">Abonado</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                    {isBalanceHidden ? '****' : formatCurrency(paidCLP)}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground pt-0.5">
                                <span>{Math.round(progress)}%</span>
                                <span>{isBalanceHidden ? '****' : formatCurrency(targetCLP - paidCLP)} pendientes</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
                        {isPaidStatus ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 flex-1 text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50 px-2 font-medium"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewPaymentDetails(sub);
                                }}
                            >
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                Pagado
                            </Button>
                        ) : isOverdue ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 flex-1 text-xs bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/50 px-2 font-medium animate-pulse"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkPaid(sub);
                                }}
                            >
                                <Clock className="mr-1.5 h-3.5 w-3.5" />
                                Atrasado
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 flex-1 text-xs bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/50 px-2 font-medium"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkPaid(sub);
                                }}
                            >
                                <CircleDollarSign className="mr-1.5 h-3.5 w-3.5" />
                                Pagar
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-8 text-xs px-0 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            disabled={isFullyPaid}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPartialPayment(sub);
                            }}
                            title="Abonar parte"
                        >
                            <CircleDollarSign className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderEmptyState = (type: 'monthly' | 'annual') => (
        <div className="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-center">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3">
                {type === 'monthly' ? (
                    <LayoutGrid className="h-6 w-6 text-zinc-400" />
                ) : (
                    <CalendarRange className="h-6 w-6 text-zinc-400" />
                )}
            </div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                No hay servicios {type === 'monthly' ? 'mensuales' : 'anuales'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs">
                {type === 'monthly'
                    ? 'Agrega servicios con cobro mensual recurrente para verlos aquí.'
                    : 'Los servicios con cobro anual aparecerán en la línea de tiempo.'}
            </p>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onCreate({
                    frequency: type === 'monthly' ? 'monthly' : 'yearly',
                    monthIndex: 0
                })}
            >
                <Plus className="mr-2 h-4 w-4" />
                Crear Servicio
            </Button>
        </div>
    );

    // Scroll Handlers
    const onMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const onMouseLeave = () => {
        setIsDragging(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const monthlyColumn = columns[0] || [];
    const timelineMonths = months.slice(1);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* View Switcher - Replaces old mobile switcher, now universal */}
            <div className="flex-1 h-full overflow-hidden">
                {mode === 'monthly' && (
                    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                        {monthlyColumn.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10">
                                {monthlyColumn.map(renderCard)}
                                {/* Add Button Card */}
                                <button
                                    onClick={() => onCreate({ frequency: 'monthly', monthIndex: 0 })}
                                    className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors min-h-[200px] group"
                                >
                                    <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Nuevo Servicio Mensual</span>
                                </button>
                            </div>
                        ) : (
                            renderEmptyState('monthly')
                        )}
                    </div>
                )}

                {mode === 'annual' && (
                    <div
                        className={cn(
                            "h-full overflow-x-auto overflow-y-hidden rounded-md border-none select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                            isDragging ? "cursor-grabbing" : "cursor-grab"
                        )}
                        ref={scrollContainerRef}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                    >
                        <div className="flex flex-row gap-4 pb-4 h-full min-w-max px-1 items-start">
                            {timelineMonths.map((monthName, i) => {
                                const originalIndex = i + 1;
                                const subs = columns[originalIndex] || [];
                                const { totalCLP_Estimated, totalUF_Estimated } = calculateColumnStats(subs);

                                return (
                                    <div key={originalIndex} className="w-[85vw] md:w-[250px] shrink-0 flex flex-col gap-3 rounded-xl bg-zinc-100/50 dark:bg-black/40 p-3 max-h-[calc(100vh-220px)] border border-zinc-200 dark:border-white/5 transition-all hover:bg-zinc-100 dark:hover:bg-black/60">
                                        <div className="flex flex-col gap-1 px-1 shrink-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                                                    {monthName}
                                                </h3>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground font-mono bg-zinc-200/50 dark:bg-zinc-900 px-2 py-0.5 rounded-full">
                                                        {subs.length}
                                                    </span>
                                                </div>
                                            </div>
                                            {subs.length > 0 && (
                                                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground font-medium mt-1">
                                                    <div className="flex items-baseline justify-between">
                                                        <span>Total CLP:</span>
                                                        <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{isBalanceHidden ? '****' : formatCurrency(totalCLP_Estimated)}</span>
                                                    </div>
                                                    {ufValue && totalUF_Estimated > 0 && (
                                                        <div className="flex items-baseline justify-between opacity-80">
                                                            <span>Total UF:</span>
                                                            <span>{isBalanceHidden ? '****' : `UF ${totalUF_Estimated.toFixed(2)}`}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                            {subs.length > 0 ? (
                                                subs.map(renderCard)
                                            ) : (
                                                <div className="flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-lg h-24 bg-white/50 dark:bg-zinc-900/20">
                                                    <span className="text-xs text-zinc-400">Sin servicios</span>
                                                </div>
                                            )}

                                            <Button
                                                variant="ghost"
                                                className="justify-start text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 h-8 text-xs px-2 font-normal mt-1 shrink-0"
                                                onClick={() => onCreate({
                                                    frequency: 'yearly',
                                                    monthIndex: originalIndex
                                                })}
                                            >
                                                <Plus className="mr-2 h-3.5 w-3.5" /> Agregar en {monthName}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

