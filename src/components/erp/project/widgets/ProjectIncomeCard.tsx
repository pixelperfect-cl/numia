import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Wallet, Receipt, PlusCircle, Calendar as CalendarIcon, Loader2, Pencil, Trash2, TrendingUp } from 'lucide-react';
import type { Project, Movement } from '@/types';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { createMovement, updateMovement, deleteMovement } from '@/lib/supabase/database';
import { logProjectActivity } from '@/lib/activityUtils';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectIncomeCardProps {
    project: Project;
    movements: Movement[];
    onUpdate: () => void;
}

export function ProjectIncomeCard({ project, movements, onUpdate }: ProjectIncomeCardProps) {
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

    // Calculate sums
    const totalAmount = project.amount || 0;
    const paidAmount = movements.reduce((sum, m) => sum + m.amount, 0);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !date || !user) return;

        const finalEntityId = project.entityId;
        setIsLoading(true);

        try {
            const numericAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ""));

            if (editingMovement) {
                await updateMovement(editingMovement.id, {
                    amount: numericAmount,
                    date: format(date, 'yyyy-MM-dd'),
                    description: description || `Abono proyecto: ${project.name}`,
                    entityId: finalEntityId,
                    isFinancial: registerInFinance
                });

                await logProjectActivity(
                    project.id,
                    'payment_updated',
                    `Abono actualizado: $${numericAmount.toLocaleString('es-CL')}`,
                    user.uid,
                    user.displayName || 'Usuario'
                );
            } else {
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

                await logProjectActivity(
                    project.id,
                    'payment_registered',
                    `Abono registrado: $${numericAmount.toLocaleString('es-CL')}`,
                    user.uid,
                    user.displayName || 'Usuario'
                );
            }

            if (registerInFinance) {
                await refreshData();
            }
            onUpdate();
            handleOpenChange(false);

        } catch (error) {
            console.error("Error saving payment:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (movementId: string) => {
        if (!confirm('¿Estás seguro de eliminar este pago?')) return;
        try {
            await deleteMovement(movementId);
            onUpdate();
            await refreshData();
            await logProjectActivity(
                project.id,
                'payment_deleted',
                `Abono eliminado`,
                user?.uid,
                user?.displayName || 'Usuario'
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
                <CardTitle className="text-sm font-medium">Ingresos / Abonos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Header Stats */}
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                ${paidAmount.toLocaleString('es-CL')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Total Cobrado
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-semibold">
                                ${pendingAmount.toLocaleString('es-CL')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Pendiente
                            </p>
                        </div>
                    </div>

                    <Progress value={paymentProgress} className="h-2 bg-secondary" indicatorClassName="bg-emerald-500" />


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
                            </DialogHeader>
                            <form onSubmit={handleRegisterPayment} className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Monto</Label>
                                    <div className="relative">
                                        <div className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground font-bold">$</div>
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
                                    <Label>Descripción</Label>
                                    <Input
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Ej. Pago inicial 50%"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="financial"
                                        checked={registerInFinance}
                                        onCheckedChange={(checked) => setRegisterInFinance(!!checked)}
                                    />
                                    <Label htmlFor="financial" className="text-sm font-medium leading-none">
                                        Registrar ingreso en finanzas
                                    </Label>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingMovement ? 'Guardar' : 'Registrar'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Payment History */}
                    <div className="space-y-3 pt-4 border-t mt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de Pagos</h4>
                        {movements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <Receipt className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                <p className="text-xs text-muted-foreground italic">No hay abonos registrados</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {movements.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between text-xs border p-2 rounded-md bg-muted/20 group hover:bg-muted/40 transition-colors">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium">{m.description || m.subcategory}</span>
                                            <span className="text-[10px] text-muted-foreground">{m.date}</span>
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
                                            >
                                                <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDelete(m.id)}
                                            >
                                                <Trash2 className="h-3 w-3 text-red-500 hover:text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
