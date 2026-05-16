import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, DollarSign } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { EnhancedSubscription } from '@/pages/erp/Services';

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription: EnhancedSubscription | null;
    onConfirm: (amount: number, date: Date, notes: string, registerMovement: boolean) => Promise<void>;
    mode: 'full' | 'partial';
    ufValue: number | null;
}

export function PaymentDialog({
    open,
    onOpenChange,
    subscription,
    onConfirm,
    mode,
    ufValue
}: PaymentDialogProps) {
    const [amount, setAmount] = useState<string>('');
    const [date, setDate] = useState<Date>(new Date());
    const [notes, setNotes] = useState('');
    const [registerMovement, setRegisterMovement] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && subscription) {
            let initialAmount = 0;
            if (mode === 'full') {
                if (subscription.currency === 'UF' && ufValue) {
                    initialAmount = Math.round(subscription.amount * ufValue);
                } else {
                    initialAmount = subscription.amount;
                }

                // Full payment = total value (no subtraction of partial payments)
            }
            setAmount(initialAmount > 0 ? initialAmount.toString() : '');
            setNotes(mode === 'full' ? `Pago mensualidad: ${subscription.name}` : `Abono: ${subscription.name}`);
            setDate(new Date());
        }
    }, [open, subscription, mode, ufValue]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        setLoading(true);
        try {
            await onConfirm(numAmount, date, notes, registerMovement);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'full' ? 'Registrar Pago Completo' : 'Registrar Abono'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'full'
                            ? 'Confirma el pago total de la suscripción. Esto actualizará la fecha de próximo cobro.'
                            : 'Registra un pago parcial. Esto no afectará la fecha de próximo cobro.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto (CLP)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="amount"
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={cn("pl-8", mode === 'full' && "bg-muted text-muted-foreground")}
                                placeholder="0"
                            />
                        </div>
                        {subscription?.currency === 'UF' && ufValue && (
                            <p className="text-xs text-muted-foreground text-right">
                                Valor UF hoy: {formatCurrency(ufValue)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="block">Fecha de Pago</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas / Descripción</Label>
                        <Input
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Detalles del pago..."
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="registerMovement"
                            checked={registerMovement}
                            onChange={(e) => setRegisterMovement(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="registerMovement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Registrar movimiento en Finanzas
                        </Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !amount}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Pago
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
