import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, Plus, MoreHorizontal, Archive, Trash2, Edit, CheckCircle2, CircleDollarSign, RotateCcw, Receipt, DollarSign, History } from 'lucide-react';
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
}

const months = [
    'General', // For monthly subscriptions
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper to get color based on service name (pseudo-random but consistent)
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
    onShowHistory
}: ServiceKanbanBoardProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [mobileView, setMobileView] = useState<'monthly' | 'annual'>('monthly');

    const columns = useMemo(() => {
        const cols: Record<number, EnhancedSubscription[]> = {};
        // 0 = Monthly (General), 1-12 = Jan-Dec

        // Initialize
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

        // Status Logic
        // Overdue: Date is in the past (yesterday or before)
        const isOverdue = isPast(date) && !isToday(date);

        // Paid (Green): Date is far in the future (> 20 days) OR explicit partial payment logic covers it (though partial is usually effectively 'pending')
        // Let's assume for monthly subs, if > 15 days, it's 'Paid' for the current month.
        // OR if paidAmount >= amount (User request: "cuando superamos el nivel del pago deberia marcarse como Pagado automaticamente")
        const daysUntilDue = differenceInDays(date, today);
        const paidAmount = sub.paidAmount || 0;
        let totalAmount = sub.amount;
        if (sub.currency === 'UF' && ufValue) totalAmount = Math.round(sub.amount * ufValue);

        // Tolerance of 10 pesos for slight calculation differences
        const isFullyPaidByAmount = totalAmount > 0 && paidAmount >= (totalAmount - 10);
        const isPaidStatus = isFullyPaidByAmount || daysUntilDue > 15;

        // Pending (Orange): Close to due date (<= 15 days) or Overdue
        // Actually, Overdue is a sub-state of Pending but red. 
        // We want: Red (Overdue), Orange (Due Soon / Pay Now), Green (Paid)

        // Value display logic
        const displayValue = () => {
            if (sub.currency === 'UF') {
                const clpValue = ufValue ? Math.round(sub.amount * ufValue) : 0;
                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-semibold text-sm">UF {sub.amount}</span>
                        {ufValue && <span className="text-[10px] text-muted-foreground">{formatCurrency(clpValue)}</span>}
                    </div>
                );
            } else {
                const ufEquivalent = ufValue ? (sub.amount / ufValue).toFixed(2) : 0;
                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-semibold text-sm">{formatCurrency(sub.amount)}</span>
                        {ufValue && <span className="text-[10px] text-muted-foreground">UF {ufEquivalent}</span>}
                    </div>
                );
            }
        };

        // Progress Calculation
        const paidCLP = sub.paidAmount || 0;
        let targetCLP = sub.amount;
        if (sub.currency === 'UF' && ufValue) {
            targetCLP = Math.round(sub.amount * ufValue);
        }

        // Progress percentage (capped at 100)
        // If target is 0 or missing, avoid division by zero
        const progress = targetCLP > 0 ? Math.min(100, (paidCLP / targetCLP) * 100) : 0;
        const isFullyPaid = targetCLP > 0 && paidCLP >= (targetCLP - 10); // 10 pesos tolerance

        return (
            <div
                key={sub.id}
                onClick={(e) => {
                    // Prevent click if we were dragging
                    if (isDragging) {
                        e.stopPropagation();
                        return;
                    }
                    onEdit(sub);
                }}
                className="group relative flex flex-col gap-1 rounded-lg bg-white dark:bg-zinc-800 p-2 shadow-sm border border-zinc-200 dark:border-white/5 transition-all hover:shadow-md cursor-pointer shrink-0"
            >
                <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-600 focus:ring-0 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                        title="Ver historial de abonos"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowHistory(sub);
                        }}
                    >
                        <CircleDollarSign className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-600 focus:ring-0" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(sub); }}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
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
                {/* Colored Label Strip */}
                <div className={cn("h-1 w-6 rounded-full mb-1", getLabelColor(sub.name))} />

                <div className="flex justify-between items-start">
                    {/* Title */}
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate pr-5 leading-tight">
                        {sub.clientName}
                    </div>
                </div>

                {/* Service Name (small) */}
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mb-1">
                    {sub.name}
                </div>

                <div className="flex items-center justify-between mt-0.5">
                    {/* Date Badge */}
                    <div className={cn(
                        "flex items-center gap-1 w-fit rounded-sm px-1 py-0.5 text-[9px] font-medium border",
                        isOverdue
                            ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 border-red-100 dark:border-red-900/50"
                            : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-100 dark:border-zinc-700"
                    )}>
                        <Clock className="h-2.5 w-2.5" />
                        <span>
                            {format(date, "d MMM yyyy", { locale: es })}
                        </span>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                        {displayValue()}
                    </div>
                </div>

                {/* Progress Bar for Partial Payments */}
                {/* Progress Bar for Partial Payments */}
                {progress > 0 && progress < 100 && (
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-zinc-500">Abonado</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(paidCLP)}
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
                            <span>{formatCurrency(paidCLP)} / {formatCurrency(targetCLP)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] mt-1">
                            <span className="text-zinc-500">Pendiente</span>
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                {formatCurrency(targetCLP - paidCLP)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Action Buttons Row - Always Visible */}
                <div className="flex gap-1.5 mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-700/50">
                    {/* Dynamic Action Button */}
                    {isPaidStatus ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 flex-1 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50 px-1 font-medium"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewPaymentDetails(sub);
                            }}
                        >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Pagado
                        </Button>
                    ) : isOverdue ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 flex-1 text-[10px] bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/50 px-1 font-medium animate-pulse"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkPaid(sub);
                            }}
                        >
                            <Clock className="mr-1 h-3 w-3" />
                            Atrasado
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 flex-1 text-[10px] bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/50 px-1 font-medium"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkPaid(sub);
                            }}
                        >
                            <CircleDollarSign className="mr-1 h-3 w-3" />
                            Pagar
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-7 text-[10px] px-0 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        disabled={isFullyPaid}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPartialPayment(sub);
                        }}
                        title="Abonar parte"
                    >
                        <CircleDollarSign className="h-3.5 w-3.5" />
                    </Button>
                </div>
                {/* Progress Bar (Only if partially paid and not fully paid yet, or just always if some payment made?) 
                    User asked: "Cuando haya un abono deberiamos tener una barra de progreso"
                */}

            </div>
        );
    };

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
        const walk = (x - startX) * 2; // Scroll-fast factor
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const monthlyColumn = columns[0] || [];
    const monthlyStats = calculateColumnStats(monthlyColumn);

    const timelineMonths = months.slice(1); // Indices 1 to 12

    const renderColumn = (subs: EnhancedSubscription[], title: string, index: number, isMonthly: boolean) => {
        const { totalCLP_Estimated, totalUF_Estimated } = calculateColumnStats(subs);

        return (
            <div key={index} className="w-[85vw] md:w-64 shrink-0 flex flex-col gap-3 rounded-xl bg-zinc-100/50 dark:bg-black/40 p-2 h-full border border-zinc-200 dark:border-white/5">
                <div className="flex flex-col gap-1 px-1 shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-700 dark:text-zinc-200 text-sm">
                            {title}
                        </h3>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground font-mono bg-zinc-200/50 dark:bg-zinc-900 px-1.5 py-0.5 rounded">
                                {subs.length}
                            </span>
                        </div>
                    </div>
                    {/* Column Total */}
                    {subs.length > 0 && (
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground font-medium mt-1">
                            {isMonthly ? (
                                // Monthly: Show UF Total prioritized
                                <>
                                    <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                                        UF {totalUF_Estimated.toFixed(1)}
                                    </span>
                                    {ufValue && <span className="opacity-70 text-[10px]">({formatCurrency(Math.round(totalUF_Estimated * ufValue))})</span>}
                                </>
                            ) : (
                                // Annual Months: Show CLP Total prioritized
                                <>
                                    <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                                        {formatCurrency(totalCLP_Estimated)}
                                    </span>
                                    {ufValue && totalUF_Estimated > 0 && (
                                        <span className="opacity-70 text-[10px]">(~UF {totalUF_Estimated.toFixed(1)})</span>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar max-h-[480px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {subs.length > 0 ? (
                        subs.map(renderCard)
                    ) : (
                        <div className="flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-800/50 rounded-lg min-h-[100px]">
                            <span className="text-xs text-zinc-500 dark:text-zinc-600">Sin servicios</span>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        className="justify-start text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 h-9 text-xs px-2 font-normal mt-1 shrink-0"
                        onClick={() => onCreate({
                            frequency: isMonthly ? 'monthly' : 'yearly',
                            monthIndex: index
                        })}
                    >
                        <Plus className="mr-2 h-3.5 w-3.5" /> Activar Servicio
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Mobile View Switcher */}
            <div className="flex md:hidden bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg shrink-0">
                <button
                    onClick={() => setMobileView('monthly')}
                    className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                        mobileView === 'monthly'
                            ? "bg-white dark:bg-black shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Mensual
                </button>
                <button
                    onClick={() => setMobileView('annual')}
                    className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                        mobileView === 'annual'
                            ? "bg-white dark:bg-black shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Anual
                </button>
            </div>

            <div className="flex-1 h-full flex overflow-hidden">
                {/* Monthly Column */}
                <div className={cn(
                    "h-full shrink-0 w-full md:w-auto transition-all duration-300",
                    mobileView === 'monthly' ? "block" : "hidden md:block" // Mobile: show only if monthly. Desktop: always show.
                )}>
                    {renderColumn(monthlyColumn, 'Mensual', 0, true)}
                </div>

                {/* Separator Line (Desktop Only) */}
                <div className="hidden md:block w-[1px] bg-zinc-200 dark:bg-zinc-800 h-full shrink-0 mx-4" />

                {/* Scrollable Right Area: Timeline */}
                <div
                    className={cn(
                        "flex-1 h-full overflow-x-auto overflow-y-hidden rounded-md border-none select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                        isDragging ? "cursor-grabbing" : "cursor-grab",
                        mobileView === 'annual' ? "block w-full" : "hidden md:block"
                    )}
                    ref={scrollContainerRef}
                    onMouseDown={onMouseDown}
                    onMouseLeave={onMouseLeave}
                    onMouseUp={onMouseUp}
                    onMouseMove={onMouseMove}
                >
                    <div className="flex flex-row gap-4 pb-4 h-full min-w-max">
                        {timelineMonths.map((monthName, i) => {
                            const originalIndex = i + 1;
                            return renderColumn(columns[originalIndex] || [], monthName, originalIndex, false);
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

