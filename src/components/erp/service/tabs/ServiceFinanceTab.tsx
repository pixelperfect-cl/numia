import { useState } from 'react';
import { EnhancedSubscription, PaymentRecord } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    CircleDollarSign, RotateCcw, Receipt, Calendar, MoreVertical,
    Pencil, Trash2, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface ServiceFinanceTabProps {
    subscription: EnhancedSubscription;
    ufValue: number | null;
    onMarkPaid: () => void;
    onPartialPayment: () => void;
    onRevertPayment: () => void;
    onDeletePayment?: (paymentId: string) => Promise<void>;
    onEditPayment?: (payment: any) => void;
}

export function ServiceFinanceTab({
    subscription: sub,
    ufValue,
    onMarkPaid,
    onPartialPayment,
    onRevertPayment,
    onDeletePayment,
    onEditPayment,
}: ServiceFinanceTabProps) {
    const { isBalanceHidden } = usePrivacy();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const paidAmount = sub.paidAmount || 0;
    let totalAmount = sub.amount;
    if (sub.currency === 'UF' && ufValue) totalAmount = Math.round(sub.amount * ufValue);
    // Dynamic tolerance: 1% for UF services (absorbs UF value fluctuations), $10 for CLP
    const paymentTolerance = sub.currency === 'UF' ? Math.max(10, Math.round(totalAmount * 0.01)) : 10;
    const isFullyPaid = totalAmount > 0 && paidAmount >= (totalAmount - paymentTolerance);
    const progress = isFullyPaid ? 100 : (totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0);

    // All payments sorted by date desc
    const allPayments = [...(sub.allPayments || [])].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const handleConfirmDelete = async () => {
        if (deletingId && onDeletePayment) {
            await onDeletePayment(deletingId);
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Payment Status Card */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Estado del periodo actual</h4>
                    {isFullyPaid && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Pagado
                        </Badge>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Abonado</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {isBalanceHidden ? '****' : formatCurrency(paidAmount)}
                        </span>
                    </div>
                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isFullyPaid ? "bg-emerald-500" : progress > 0 ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700"
                            )}
                            style={{ width: `${Math.max(progress, 2)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{Math.round(progress)}%</span>
                        <span>
                            Meta: {isBalanceHidden ? '****' : formatCurrency(totalAmount)}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                    <Button
                        size="sm"
                        className="flex-1"
                        onClick={onMarkPaid}
                        disabled={isFullyPaid}
                    >
                        <CircleDollarSign className="mr-2 h-4 w-4" />
                        Pagar completo
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={onPartialPayment}
                        disabled={isFullyPaid}
                    >
                        <CircleDollarSign className="mr-2 h-4 w-4" />
                        Abonar parte
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRevertPayment}
                        className="text-muted-foreground"
                        title="Deshacer último pago"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Payment History */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Historial de Pagos
                    </h4>
                    <Badge variant="secondary" className="font-mono text-xs">
                        {allPayments.length} {allPayments.length === 1 ? 'pago' : 'pagos'}
                    </Badge>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {allPayments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            No hay pagos registrados.
                        </div>
                    ) : (
                        allPayments.map((mov) => (
                            <div key={mov.id} className="flex items-start gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={cn(
                                        "h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center",
                                        "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                    )}>
                                        <ArrowDownRight className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium">
                                            {(() => {
                                                try {
                                                    if (!mov.date) return 'Fecha desconocida';
                                                    const dateObj = typeof mov.date === 'string' && !mov.date.includes('T')
                                                        ? new Date(mov.date + 'T00:00:00')
                                                        : new Date(mov.date);
                                                    return format(dateObj, "d 'de' MMMM, yyyy", { locale: es });
                                                } catch {
                                                    return 'Fecha inválida';
                                                }
                                            })()}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            {mov.description && (
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {mov.description}
                                                </div>
                                            )}
                                            <div className={cn(
                                                "text-[10px]",
                                                mov.isFinancial === false ? "text-amber-600 dark:text-amber-500" : "text-zinc-400"
                                            )}>
                                                {mov.isFinancial === false ? "Solo registro interno" : "Registrado en Finanzas"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="font-semibold text-sm whitespace-nowrap">
                                        {isBalanceHidden ? '****' : formatCurrency(mov.amount)}
                                    </div>
                                    {(onEditPayment || onDeletePayment) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {onEditPayment && (
                                                    <DropdownMenuItem onClick={() => onEditPayment(mov)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                )}
                                                {onDeletePayment && (
                                                    <DropdownMenuItem
                                                        onClick={() => setDeletingId(mov.id)}
                                                        className="text-red-500 focus:text-red-500"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el registro del pago.
                            Si el pago generó un movimiento financiero, este también será eliminado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
