import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { EntitySubscription } from '@/types';
import { Loader2 } from 'lucide-react';

interface SubscriptionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription?: EntitySubscription;
    entityId: string;
}

const FREQUENCIES = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
];

const CURRENCIES = ['CLP', 'USD', 'EUR', 'UF'];

export function SubscriptionForm({ open, onOpenChange, subscription, entityId }: SubscriptionFormProps) {
    const { createEntitySubscription, updateEntitySubscription, categories, entities } = useData();
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('CLP');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [nextPaymentDate, setNextPaymentDate] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [box, setBox] = useState('');
    const [description, setDescription] = useState('');

    const entity = entities.find(e => e.id === entityId);
    const expenseCategories = categories.filter(c => c.type === 'expense');

    // Get boxes from entity
    const boxes = entity ? Object.entries(entity.boxes).map(([key, value]) => ({
        key,
        ...value
    })).sort((a, b) => a.order - b.order) : [];

    useEffect(() => {
        if (subscription) {
            setName(subscription.name);
            setAmount(subscription.amount.toString());
            setCurrency(subscription.currency);
            setBillingCycle(subscription.billingCycle);
            setNextPaymentDate(subscription.nextPaymentDate.split('T')[0]); // Handle ISO string
            setCategoryId(subscription.categoryId);
            setBox(subscription.box);
            setDescription(subscription.description || '');
        } else {
            // Defaults
            setName('');
            setAmount('');
            setCurrency('CLP');
            setBillingCycle('monthly');
            setNextPaymentDate(new Date().toISOString().split('T')[0]);
            setCategoryId('');
            setBox(boxes.find(b => b.isDefault)?.key || boxes[0]?.key || '');
            setDescription('');
        }
    }, [subscription, open, entityId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entityId || !categoryId || !box) return;

        setLoading(true);
        try {
            const data = {
                name,
                amount: parseFloat(amount),
                currency,
                billingCycle,
                nextPaymentDate,
                categoryId,
                box,
                description,
                status: subscription?.status || 'active', // Default to active
            };

            if (subscription) {
                await updateEntitySubscription(subscription.id, data);
            } else {
                await createEntitySubscription(data, entityId);
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{subscription ? 'Editar Suscripción' : 'Nueva Suscripción'}</DialogTitle>
                    <DialogDescription>
                        Registra un servicio recurrente para gestionar tus gastos fijos.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="name">Nombre del Servicio</Label>
                            <Input
                                id="name"
                                placeholder="Ej. Netflix, AWS, Adobe..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">Moneda</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Moneda" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map(curr => (
                                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cycle">Frecuencia</Label>
                            <Select value={billingCycle} onValueChange={(v: any) => setBillingCycle(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {FREQUENCIES.map(freq => (
                                        <SelectItem key={freq.value} value={freq.value}>
                                            {freq.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Próximo Pago</Label>
                            <Input
                                id="date"
                                type="date"
                                value={nextPaymentDate}
                                onChange={(e) => setNextPaymentDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="category">Categoría</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar categoría..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {expenseCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                                {cat.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="box">Caja / Cuenta de Pago</Label>
                            <Select value={box} onValueChange={setBox}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar caja..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {boxes.map(b => (
                                        <SelectItem key={b.key} value={b.key}>
                                            {b.key} {b.currency && `(${b.currency})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="desc">Descripción (Opcional)</Label>
                            <Textarea
                                id="desc"
                                placeholder="Detalles adicionales..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {subscription ? 'Guardar Cambios' : 'Crear Suscripción'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
