import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import type { EnhancedSubscription } from "@/pages/erp/Services";

interface PaymentDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription: EnhancedSubscription | null;
    onRevert: (sub: EnhancedSubscription) => Promise<void>;
}

export function PaymentDetailDialog({
    open,
    onOpenChange,
    subscription,
    onRevert
}: PaymentDetailDialogProps) {
    const [loading, setLoading] = useState(false);
    if (!subscription) return null;

    const handleRevert = async () => {
        setLoading(true);
        try {
            await onRevert(subscription);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <DialogTitle>Detalle de Pago</DialogTitle>
                    </div>
                    <DialogDescription>
                        Este servicio se encuentra al día.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="font-medium text-muted-foreground">Cliente</div>
                        <div className="text-right">{subscription.clientName}</div>

                        <div className="font-medium text-muted-foreground">Servicio</div>
                        <div className="text-right">{subscription.name}</div>

                        <div className="font-medium text-muted-foreground">Próximo Vencimiento</div>
                        <div className="text-right font-semibold">
                            {(() => {
                                try {
                                    if (!subscription.nextBillingDate) return 'N/A';
                                    const d = subscription.nextBillingDate;
                                    const dateObj = typeof d === 'string' && !d.includes('T')
                                        ? new Date(d + 'T00:00:00')
                                        : new Date(d);
                                    return format(dateObj, "PPP", { locale: es });
                                } catch (e) {
                                    return 'Fecha inválida';
                                }
                            })()}
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm flex gap-2 items-start text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>
                            Si realizaste este pago por error, puedes deshacerlo. Esto retrocederá la fecha de cobro y te permitirá eliminar el movimiento financiero asociado.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cerrar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleRevert}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                        Deshacer Pago
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
