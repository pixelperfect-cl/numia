import { EnhancedSubscription } from '@/types';
import { formatCurrency, cn, parseLocalDateString } from '@/lib/utils';
import { format, isPast, isToday, differenceInDays, differenceInCalendarMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Clock, Globe, Calendar, Edit, Archive, Trash2, Briefcase, CircleDollarSign,
    CheckCircle2, AlertTriangle, TrendingUp
} from 'lucide-react';

interface ServiceGeneralTabProps {
    subscription: EnhancedSubscription;
    ufValue: number | null;
    onEdit: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onViewClient: () => void;
}

export function ServiceGeneralTab({
    subscription: sub,
    ufValue,
    onEdit,
    onArchive,
    onDelete,
    onViewClient,
}: ServiceGeneralTabProps) {
    const date = parseLocalDateString(sub.nextBillingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = isPast(date) && !isToday(date);
    const daysUntilDue = differenceInDays(date, today);

    const paidAmount = sub.paidAmount || 0;
    let totalAmount = sub.amount;
    if (sub.currency === 'UF' && ufValue) totalAmount = Math.round(sub.amount * ufValue);
    const progress = totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0;
    const isFullyPaid = totalAmount > 0 && paidAmount >= (totalAmount - 10);

    const startDate = parseLocalDateString(sub.startDate);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Service Info Card */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{sub.name}</h3>
                    <Badge variant={sub.frequency === 'monthly' ? 'default' : 'secondary'}>
                        {sub.frequency === 'monthly' ? 'Mensual' : 'Anual'}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Monto</span>
                        <div className="text-2xl font-bold">
                            {sub.currency === 'UF' ? (
                                <span>UF {Number.isInteger(sub.amount) ? sub.amount : sub.amount.toFixed(2)}</span>
                            ) : (
                                <span>{formatCurrency(sub.amount)}</span>
                            )}
                        </div>
                        {sub.currency === 'UF' && ufValue && (
                            <div className="text-sm text-muted-foreground">
                                ≈ {formatCurrency(Math.round(sub.amount * ufValue))}
                            </div>
                        )}
                        {sub.currency !== 'UF' && ufValue && (
                            <div className="text-sm text-muted-foreground">
                                ≈ UF {(sub.amount / ufValue).toFixed(2)}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Estado del pago</span>
                        {isFullyPaid ? (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-semibold">Al día</span>
                            </div>
                        ) : isOverdue ? (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-5 w-5" />
                                <span className="font-semibold">Atrasado</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <Clock className="h-5 w-5" />
                                <span className="font-semibold">Pendiente</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Progress */}
                {progress > 0 && progress < 100 && (
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Abonado este periodo</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(paidAmount)}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{Math.round(progress)}%</span>
                            <span>{formatCurrency(totalAmount - paidAmount)} pendientes</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Dates */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Fechas</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Inicio</div>
                            <div className="text-sm font-medium">
                                {format(startDate, "d MMM yyyy", { locale: es })}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center",
                            isOverdue ? "bg-red-50 dark:bg-red-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"
                        )}>
                            <Clock className={cn(
                                "h-4 w-4",
                                isOverdue ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                            )} />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Próximo cobro</div>
                            <div className={cn(
                                "text-sm font-medium",
                                isOverdue && "text-red-600 dark:text-red-400"
                            )}>
                                {format(date, "d MMM yyyy", { locale: es })}
                            </div>
                            {isOverdue && (
                                <div className="text-[10px] text-red-500">
                                    {Math.abs(daysUntilDue)} días de atraso
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Client */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Cliente</h4>
                <div
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer -mx-1"
                    onClick={onViewClient}
                >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                            {sub.clientName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{sub.clientName}</p>
                        {sub.clientWebsite && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                <span className="truncate">{sub.clientWebsite.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                            </div>
                        )}
                    </div>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            {/* Notes */}
            {sub.notes && (
                <div className="rounded-xl border bg-card p-5 space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Notas del Servicio</h4>
                    <p className="text-sm whitespace-pre-wrap">{sub.notes}</p>
                </div>
            )}

            {/* Actions */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Acciones</h4>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" /> Editar Servicio
                    </Button>
                    <Button variant="outline" size="sm" onClick={onArchive}>
                        <Archive className="mr-2 h-4 w-4" /> Archivar
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:border-red-200" onClick={onDelete}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                </div>
            </div>
        </div>
    );
}
