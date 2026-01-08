
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Receipt, Calendar, MoreVertical, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Movement, PaymentRecord } from "@/types";
import { useState } from "react";

interface PaymentHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    movements: Movement[];
    allPayments?: Movement[]; // This should really be PaymentRecord[] ideally but we mapped it to Movement
    totalAmount: number;
    currency: string;
    onDelete?: (paymentId: string) => Promise<void>;
    onEdit?: (payment: any) => void;
}

export function PaymentHistoryDialog({
    open,
    onOpenChange,
    movements,
    allPayments,
    totalAmount,
    currency,
    onDelete,
    onEdit
}: PaymentHistoryDialogProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Helper to confirm deletion
    const handleConfirmDelete = async () => {
        if (deletingId && onDelete) {
            await onDelete(deletingId);
            setDeletingId(null);
        }
    };
    const totalPaid = movements.reduce((sum, m) => sum + m.amount, 0);
    const displayMovements = allPayments || movements;
    // Sort by date desc
    const sortedMovements = [...displayMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Historial de Pagos
                    </DialogTitle>
                    <DialogDescription>
                        Pagos registrados para el periodo actual.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Summary Card */}
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-zinc-500">Total Abonado</span>
                            <span className="font-semibold text-emerald-600">
                                {formatCurrency(totalPaid)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-zinc-400">
                            <span>Meta del periodo</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0)}%` }}
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {movements.length === 0 ? (
                            <div className="text-center py-8 text-zinc-400 text-sm">
                                No hay abonos registrados en este periodo.
                            </div>
                        ) : (
                            movements.map((mov) => (
                                <div key={mov.id} className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">
                                                {(() => {
                                                    try {
                                                        return mov.date ? format(new Date(mov.date + 'T00:00:00'), "d 'de' MMMM", { locale: es }) : 'Fecha desconocida';
                                                    } catch (e) {
                                                        return mov.date || 'Fecha inválida';
                                                    }
                                                })()}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                {mov.description && (
                                                    <div className="text-xs text-zinc-500 truncate max-w-[150px]">
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
                                    <div className="font-medium text-sm">
                                        {formatCurrency(mov.amount)}
                                    </div>

                                    {(onEdit || onDelete) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-zinc-400 hover:text-zinc-600">
                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {onEdit && (
                                                    <DropdownMenuItem onClick={() => onEdit(mov)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                )}
                                                {onDelete && (
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
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>

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
        </Dialog>
    );
}
