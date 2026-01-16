
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Wallet, Receipt, PlusCircle, Calendar as CalendarIcon, Loader2, Edit, Pencil, Trash2 } from 'lucide-react';
import type { Project, Movement } from '@/types';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { createMovement, getMovements, updateMovement, deleteMovement } from '@/lib/firebase/database';
import { logProjectActivity } from '@/lib/activityUtils';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectFinanceCardProps {
    project: Project;
}

export function ProjectFinanceCard({ project }: ProjectFinanceCardProps) {
    const { user } = useAuth();
    const { refreshData } = useData();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

    // Form State
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [registerInFinance, setRegisterInFinance] = useState(true);


    // Data State
    const [movements, setMovements] = useState<Movement[]>([]);

    useEffect(() => {
        const fetchMovements = async () => {
            if (user?.uid && project.id) {
                try {
                    const movs = await getMovements(user.uid, { projectId: project.id });
                    setMovements(movs);
                } catch (err) {
                    console.error("Error fetching project movements:", err);
                }
            }
        };
        fetchMovements();
    }, [user?.uid, project.id, isDialogOpen]);

    // Calculate sums
    const totalAmount = project.amount || 0;
    const paidAmount = movements
        .filter(m => m.type === 'income')
        .reduce((sum, m) => sum + m.amount, 0);
    const pendingAmount = totalAmount - paidAmount;
    const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !date || !user) return;

        if (!amount || !date || !user) return;

        // Always use the project's entityId
        const finalEntityId = project.entityId;

        setIsLoading(true);
        try {
            const numericAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ""));

            if (editingMovement) {
                // UPDATE Existing Movement
                await updateMovement(editingMovement.id, {
                    amount: numericAmount,
                    date: format(date, 'yyyy-MM-dd'),
                    description: description || `Abono proyecto: ${project.name}`,
                    entityId: finalEntityId,
                    isFinancial: registerInFinance
                });

                if (registerInFinance) {
                    await refreshData();
                }

                // Log Activity (Update)
                await logProjectActivity(
                    project.id,
                    'payment_updated',
                    `Abono actualizado: $${numericAmount.toLocaleString('es-CL')}${registerInFinance ? ' (Con registro financiero)' : ''}`,
                    user.uid,
                    user.displayName || 'Usuario',
                    { amount: numericAmount, date: date, financial: registerInFinance, movementId: editingMovement.id }
                );

            } else {
                // CREATE New Movement
                await createMovement(user.uid, {
                    type: 'income',
                    category: 'Ingreso',
                    subcategory: 'Abono Proyecto',
                    amount: numericAmount,
                    date: format(date, 'yyyy-MM-dd'),
                    description: description || `Abono proyecto: ${project.name}`,
                    entityId: finalEntityId,
                    categoryId: 'cat_income_project',
                    box: 'Caja Principal',
                    projectId: project.id,
                    isFinancial: registerInFinance
                });

                if (registerInFinance) {
                    await refreshData();
                }

                // Log Activity (New)
                await logProjectActivity(
                    project.id,
                    'payment_registered',
                    `Abono registrado: $${numericAmount.toLocaleString('es-CL')}${registerInFinance ? ' (Con registro financiero)' : ''}`,
                    user.uid,
                    user.displayName || 'Usuario',
                    { amount: numericAmount, date: date, financial: registerInFinance }
                );
            }

            // Close and Reset
            setIsDialogOpen(false);
            setEditingMovement(null);
            setAmount('');
            setDescription('');
            setDate(new Date());
            setRegisterInFinance(true);

        } catch (error) {
            console.error("Error saving payment:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (movementId: string) => {
        if (!confirm('¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.')) return;

        try {
            await deleteMovement(movementId);
            // Verify if we need to manually update state or if parent/useEffect handles it. 
            // In this component, we fetch in useEffect dependent on isDialogOpen, but NOT on delete.
            // So let's refresh manually
            const movs = await getMovements(user!.uid, { projectId: project.id });
            setMovements(movs);
            await refreshData();

            await logProjectActivity(
                project.id,
                'payment_deleted',
                `Abono eliminado`,
                user!.uid,
                user!.displayName || 'Usuario',
                { movementId }
            );

        } catch (error) {
            console.error("Error deleting payment:", error);
        }
    };

    const handleEditClick = (m: Movement) => {
        setEditingMovement(m);
        setAmount(m.amount.toString());
        setDescription(m.description || '');
        setDate(new Date(m.date + 'T12:00:00'));
        setRegisterInFinance(m.isFinancial !== false);
        setIsDialogOpen(true);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setEditingMovement(null);
            setAmount('');
            setDescription('');
            setDate(new Date());
            setRegisterInFinance(true);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Finanzas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Total Budget */}
                    <div>
                        <div className="text-2xl font-bold">
                            ${totalAmount.toLocaleString('es-CL')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Presupuesto Total ({project.currency || 'CLP'})
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Pagado ({Math.round(paymentProgress)}%)</span>
                            <span className="font-medium">${paidAmount.toLocaleString('es-CL')}</span>
                        </div>
                        <Progress value={paymentProgress} className="h-2" />
                    </div>

                    {/* Detailed Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Wallet className="h-3 w-3" /> Por Cobrar
                            </span>
                            <span className="font-semibold text-sm">
                                ${pendingAmount.toLocaleString('es-CL')}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Receipt className="h-3 w-3" /> Facturado
                            </span>
                            <span className="font-semibold text-sm">
                                $0
                            </span>
                        </div>
                    </div>

                    {/* Add Payment Button & Dialog */}
                    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                Registrar Abono
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingMovement ? 'Editar Abono' : 'Registrar Abono'}</DialogTitle>
                                <div className="sr-only">Formulario para registrar o editar un abono del proyecto</div>
                            </DialogHeader>
                            <form onSubmit={handleRegisterPayment} className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Monto</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className="pl-8"
                                            placeholder="0"
                                            type="number"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Fecha</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
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
                                    <Label>Descripción (Opcional)</Label>
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Ej. Pago anticipo 50%"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="financial"
                                        checked={registerInFinance}
                                        onCheckedChange={(checked) => setRegisterInFinance(!!checked)}
                                    />
                                    <Label htmlFor="financial" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Registrar ingreso en finanzas bancarias
                                    </Label>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingMovement ? 'Guardar Cambios' : 'Registrar'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Payment History */}
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de Pagos</h4>
                    {movements.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-2">No hay pagos registrados</p>
                    ) : (
                        <div className="space-y-2">
                            {movements.map((m) => (
                                <div key={m.id} className="flex items-center justify-between text-xs border p-2 rounded-md bg-muted/20 group">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">{m.description || m.subcategory || 'Pago'}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground">{m.date}</span>
                                            {m.isFinancial === false ? (
                                                <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-sm">
                                                    Solo registro interno
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                                                    Registro financiero
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-emerald-600 mr-2">
                                            +${m.amount.toLocaleString('es-CL')}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleEditClick(m)}
                                            title="Editar"
                                        >
                                            <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDelete(m.id)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-3 w-3 text-red-500 hover:text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
