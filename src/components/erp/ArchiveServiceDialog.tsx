import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Archive, Loader2 } from 'lucide-react';
import type { EnhancedSubscription } from '@/types';

const ARCHIVE_REASONS = [
    { value: 'completed', label: 'Servicio Concluido' },
    { value: 'inactive_client', label: 'Cliente inactivo' },
    { value: 'plan_change', label: 'Cambio de plan' },
    { value: 'no_renewal', label: 'No renovación' },
    { value: 'other', label: 'Otro' },
] as const;

interface ArchiveServiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription: EnhancedSubscription | null;
    onConfirm: (reason: string, notes: string) => Promise<void>;
}

export function ArchiveServiceDialog({
    open,
    onOpenChange,
    subscription,
    onConfirm
}: ArchiveServiceDialogProps) {
    const [selectedReason, setSelectedReason] = useState<string>('completed');
    const [customReason, setCustomReason] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!subscription) return;

        const reason = selectedReason === 'other'
            ? customReason
            : ARCHIVE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

        if (selectedReason === 'other' && !customReason.trim()) {
            return; // Don't submit if "other" is selected but no custom reason provided
        }

        setLoading(true);
        try {
            await onConfirm(reason, notes);
            // Reset form
            setSelectedReason('completed');
            setCustomReason('');
            setNotes('');
            onOpenChange(false);
        } catch (error) {
            console.error('Error archiving service:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            // Reset form when closing
            setSelectedReason('completed');
            setCustomReason('');
            setNotes('');
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-muted-foreground" />
                        Archivar Servicio
                    </DialogTitle>
                    <DialogDescription>
                        {subscription && (
                            <span>
                                Archivando <strong>{subscription.name}</strong> de <strong>{subscription.clientName}</strong>
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Reason Selection */}
                    <div className="space-y-3">
                        <Label>Motivo del archivado</Label>
                        <RadioGroup
                            value={selectedReason}
                            onValueChange={setSelectedReason}
                            className="space-y-2"
                        >
                            {ARCHIVE_REASONS.map((reason) => (
                                <div
                                    key={reason.value}
                                    className="flex items-center space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedReason(reason.value)}
                                >
                                    <RadioGroupItem value={reason.value} id={reason.value} />
                                    <Label
                                        htmlFor={reason.value}
                                        className="flex-1 cursor-pointer font-normal"
                                    >
                                        {reason.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>

                        {/* Custom Reason Input */}
                        {selectedReason === 'other' && (
                            <Input
                                placeholder="Especifica el motivo..."
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                className="mt-2"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Comentarios adicionales (opcional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Añade cualquier información relevante..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || (selectedReason === 'other' && !customReason.trim())}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Archive className="mr-2 h-4 w-4" />
                        Archivar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
