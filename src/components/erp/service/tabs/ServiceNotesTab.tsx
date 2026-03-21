import { useState } from 'react';
import { EnhancedSubscription, ServiceActivityEntry } from '@/types';
import { updateSubscription } from '@/lib/supabase/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    Save, StickyNote, CircleDollarSign, Edit, Archive, RefreshCw,
    MessageSquare, Clock
} from 'lucide-react';

interface ServiceNotesTabProps {
    subscription: EnhancedSubscription;
    onUpdate: (updated: EnhancedSubscription) => void;
}

const activityIcons: Record<string, any> = {
    payment: CircleDollarSign,
    status_change: RefreshCw,
    edit: Edit,
    note: MessageSquare,
};

const activityColors: Record<string, string> = {
    payment: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    status_change: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    edit: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    note: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
};

export function ServiceNotesTab({ subscription, onUpdate }: ServiceNotesTabProps) {
    const [notes, setNotes] = useState(subscription.notes || '');
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleNotesChange = (value: string) => {
        setNotes(value);
        setHasChanges(value !== (subscription.notes || ''));
    };

    const handleSaveNotes = async () => {
        setSaving(true);
        try {
            await updateSubscription(subscription.id, { notes });
            onUpdate({ ...subscription, notes });
            setHasChanges(false);
        } catch (error) {
            console.error("Error saving notes:", error);
        } finally {
            setSaving(false);
        }
    };

    // Derive activity from payments (since we don't have activityLog stored yet, build from payments)
    const activityEntries: ServiceActivityEntry[] = [
        // From stored activity log
        ...(subscription.activityLog || []),
        // Auto-derive from payments
        ...(subscription.payments || []).map(p => ({
            id: `payment-${p.id}`,
            type: 'payment' as const,
            description: `Pago registrado: $${p.amount.toLocaleString()}${p.notes ? ` - ${p.notes}` : ''}`,
            date: p.date,
            metadata: { amount: p.amount, isFinancial: p.isFinancial }
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Notes */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <StickyNote className="h-4 w-4" />
                        Notas
                    </h4>
                    {hasChanges && (
                        <Button
                            size="sm"
                            variant="default"
                            onClick={handleSaveNotes}
                            disabled={saving}
                        >
                            <Save className="mr-2 h-3.5 w-3.5" />
                            {saving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    )}
                </div>

                <Textarea
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Escribe notas sobre este servicio..."
                    className="min-h-[120px] resize-none"
                    rows={5}
                />
            </div>

            {/* Activity Timeline */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Actividad Reciente
                </h4>

                {activityEntries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No hay actividad registrada.
                    </div>
                ) : (
                    <div className="relative space-y-0">
                        {/* Timeline line */}
                        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                        {activityEntries.map((entry, i) => {
                            const IconComponent = activityIcons[entry.type] || MessageSquare;
                            const colorClass = activityColors[entry.type] || activityColors.note;

                            return (
                                <div key={entry.id} className="relative flex items-start gap-3 py-2.5 pl-0">
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 border border-background",
                                        colorClass
                                    )}>
                                        <IconComponent className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="text-sm">{entry.description}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {(() => {
                                                try {
                                                    const dateObj = typeof entry.date === 'string' && !entry.date.includes('T')
                                                        ? new Date(entry.date + 'T00:00:00')
                                                        : new Date(entry.date);
                                                    return format(dateObj, "d 'de' MMMM, yyyy", { locale: es });
                                                } catch {
                                                    return entry.date;
                                                }
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
