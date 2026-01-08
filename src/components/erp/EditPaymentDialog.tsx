import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, DollarSign } from 'lucide-react';
import { PaymentRecord } from '@/types';

interface EditPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: PaymentRecord | null;
    onSave: (paymentId: string, updates: { amount: number; notes: string }) => Promise<void>;
}

export function EditPaymentDialog({
    open,
    onOpenChange,
    payment,
    onSave
}: EditPaymentDialogProps) {
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && payment) {
            setAmount(payment.amount.toString());
            setNotes(payment.notes || '');
        }
    }, [open, payment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payment) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        setLoading(true);
        try {
            await onSave(payment.id, { amount: numAmount, notes });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update payment", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Pago</DialogTitle>
                    <DialogDescription>
                        Modifica el monto o las notas de este registro.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-amount">Monto</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="edit-amount"
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-notes">Notas</Label>
                        <Textarea
                            id="edit-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Detalles opcionales..."
                            className="resize-none"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
