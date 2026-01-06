import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import type { Subscription } from '@/types';
import { format } from 'date-fns';

interface SubscriptionManagerProps {
    subscriptions: Partial<Subscription>[];
    onChange: (subscriptions: Partial<Subscription>[]) => void;
}

export function SubscriptionManager({ subscriptions, onChange }: SubscriptionManagerProps) {
    const [newSub, setNewSub] = useState<Partial<Subscription>>({
        name: '',
        amount: 0,
        frequency: 'monthly',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'active'
    });

    const handleAdd = () => {
        if (!newSub.name || !newSub.amount) return;

        // Calculate next billing date based on start date
        const nextBilling = newSub.startDate; // Simplification for now

        onChange([...subscriptions, { ...newSub, nextBillingDate: nextBilling }]);
        setNewSub({
            name: '',
            amount: 0,
            frequency: 'monthly',
            startDate: format(new Date(), 'yyyy-MM-dd'),
            status: 'active'
        });
    };

    const handleRemove = (index: number) => {
        const newSubs = [...subscriptions];
        newSubs.splice(index, 1);
        onChange(newSubs);
    };

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-medium">Suscripciones / Planes Recurrentes</h3>

            {/* List Existing */}
            <div className="space-y-2">
                {subscriptions.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Sin suscripciones activas.</p>
                )}
                {subscriptions.map((sub, index) => (
                    <div key={index} className="flex items-center justify-between bg-card p-2 rounded border text-sm">
                        <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-xs text-muted-foreground">
                                ${sub.amount?.toLocaleString()} - {sub.frequency}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(index)} className="h-6 w-6 text-red-500">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Add New Form */}
            <div className="grid gap-3 pt-2 border-t mt-2">
                <Input
                    placeholder="Nombre servicio (ej. Hosting)"
                    value={newSub.name}
                    onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                    className="h-8 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        type="number"
                        placeholder="Monto"
                        value={newSub.amount || ''}
                        onChange={(e) => setNewSub({ ...newSub, amount: Number(e.target.value) })}
                        className="h-8 text-sm"
                    />
                    <Select
                        value={newSub.frequency}
                        onValueChange={(val: any) => setNewSub({ ...newSub, frequency: val })}
                    >
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Mensual</SelectItem>
                            <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">Inicio</Label>
                        <Input
                            type="date"
                            value={newSub.startDate}
                            onChange={(e) => setNewSub({ ...newSub, startDate: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                </div>
                <Button onClick={handleAdd} size="sm" variant="secondary" className="w-full h-8">
                    <Plus className="mr-2 h-3 w-3" /> Agregar Plan
                </Button>
            </div>
        </div>
    );
}
