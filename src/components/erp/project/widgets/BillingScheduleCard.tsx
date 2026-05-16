import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarRange, CalendarIcon, PlusCircle, Trash2, Pencil, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { updateProject } from '@/lib/supabase/database';
import { toast } from 'sonner';
import type { Project, ProjectBillingInstallment } from '@/types';

interface BillingScheduleCardProps {
    project: Project;
    onUpdate: () => void;
}

export function BillingScheduleCard({ project, onUpdate }: BillingScheduleCardProps) {
    const installments = (project.billingInstallments ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ProjectBillingInstallment | null>(null);
    const [date, setDate] = useState<Date>(new Date());
    const [amount, setAmount] = useState('');
    const [label, setLabel] = useState('');
    const [saving, setSaving] = useState(false);

    const totalScheduled = installments.reduce((sum, i) => sum + i.amount, 0);
    const generated = installments.filter(i => i.generated).length;
    const pending = installments.length - generated;

    const resetForm = () => {
        setEditing(null);
        setDate(new Date());
        setAmount('');
        setLabel('');
    };

    const openCreate = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (item: ProjectBillingInstallment) => {
        setEditing(item);
        setDate(new Date(item.date + 'T12:00:00'));
        setAmount(String(item.amount));
        setLabel(item.label ?? '');
        setDialogOpen(true);
    };

    const persist = async (next: ProjectBillingInstallment[]) => {
        setSaving(true);
        try {
            await updateProject(project.id, { billingInstallments: next });
            onUpdate();
        } catch (err) {
            console.error('persist installments', err);
            toast.error('No se pudo guardar el cobro');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        const numericAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
        if (!numericAmount || numericAmount <= 0) {
            toast.error('Monto inválido');
            return;
        }
        const dateStr = format(date, 'yyyy-MM-dd');

        let next: ProjectBillingInstallment[];
        if (editing) {
            if (editing.generated) {
                toast.error('No se puede editar un cobro ya generado');
                return;
            }
            next = installments.map(i => i.id === editing.id ? { ...i, date: dateStr, amount: numericAmount, label: label || undefined } : i);
        } else {
            next = [...installments, {
                id: crypto.randomUUID(),
                date: dateStr,
                amount: numericAmount,
                label: label || undefined,
            }];
        }
        await persist(next);
        setDialogOpen(false);
        resetForm();
    };

    const handleDelete = async (item: ProjectBillingInstallment) => {
        if (item.generated) {
            toast.error('No se puede eliminar un cobro ya generado. Elimina el movimiento desde Ingresos.');
            return;
        }
        if (!confirm(`¿Eliminar el cobro programado de $${item.amount.toLocaleString('es-CL')} del ${item.date}?`)) return;
        await persist(installments.filter(i => i.id !== item.id));
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobros Programados</CardTitle>
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md border bg-muted/20 py-2">
                            <div className="text-xs text-muted-foreground">Programado</div>
                            <div className="text-sm font-semibold">${totalScheduled.toLocaleString('es-CL')}</div>
                        </div>
                        <div className="rounded-md border bg-muted/20 py-2">
                            <div className="text-xs text-muted-foreground">Pendientes</div>
                            <div className="text-sm font-semibold">{pending}</div>
                        </div>
                        <div className="rounded-md border bg-muted/20 py-2">
                            <div className="text-xs text-muted-foreground">Generados</div>
                            <div className="text-sm font-semibold text-emerald-600">{generated}</div>
                        </div>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={openCreate}>
                                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                Programar Cobro
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editing ? 'Editar Cobro Programado' : 'Programar Cobro'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Etiqueta (opcional)</Label>
                                    <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: Anticipo 30%" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Monto</Label>
                                    <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" />
                                    <p className="text-[10px] text-muted-foreground">En la moneda del proyecto ({project.currency || 'CLP'})</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Fecha de cobro</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date ? format(date, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    El cobro se generará automáticamente ese día y, si está configurado,
                                    se enviará el email de "Cobro Generado" al cliente.
                                </p>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? 'Guardar' : 'Programar'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="space-y-2 pt-2 border-t">
                        {installments.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-3">
                                Sin cobros programados. Los cobros se generan automáticamente en la fecha indicada.
                            </p>
                        ) : (
                            installments.map(item => (
                                <div key={item.id} className="flex items-center justify-between border rounded-md p-2 text-xs group bg-muted/10 hover:bg-muted/30 transition-colors">
                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{item.label || 'Cobro'}</span>
                                            {item.generated && (
                                                <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0">
                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Generado
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{item.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-sm mr-2">${item.amount.toLocaleString('es-CL')}</span>
                                        {!item.generated && (
                                            <>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(item)}>
                                                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(item)}>
                                                    <Trash2 className="h-3 w-3 text-red-500 hover:text-red-600" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
