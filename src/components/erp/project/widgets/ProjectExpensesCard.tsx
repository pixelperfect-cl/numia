import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, Receipt, PlusCircle, Calendar as CalendarIcon, Loader2, Pencil, Trash2, Tag, AlertCircle } from 'lucide-react';
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
import { Badge } from "@/components/ui/badge";

interface ProjectExpensesCardProps {
    project: Project;
    expenses: Movement[];
    onUpdate: () => void;
}

export function ProjectExpensesCard({ project, expenses, onUpdate }: ProjectExpensesCardProps) {
    const { user } = useAuth();
    const { refreshData } = useData();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

    // Form State
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [category, setCategory] = useState('');
    const [registerInFinance, setRegisterInFinance] = useState(true);

    const totalExpenses = expenses.reduce((sum, m) => sum + m.amount, 0);

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !date || !user) return;

        setIsLoading(true);
        try {
            const numericAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
            const finalEntityId = project.entityId;

            if (editingMovement) {
                await updateMovement(editingMovement.id, {
                    amount: numericAmount,
                    date: format(date, 'yyyy-MM-dd'),
                    description: description || `Gasto proyecto: ${project.name}`,
                    category: category || 'Gasto Proyecto', // Store category name usually in `category` or deprecate logic? Using `category` field as string for now based on types
                    subcategory: description,
                    entityId: finalEntityId,
                    isFinancial: registerInFinance
                });

                await logProjectActivity(
                    project.id,
                    'expense_updated',
                    `Gasto actualizado: $${numericAmount.toLocaleString('es-CL')}`,
                    user.uid,
                    user.displayName || 'Usuario'
                );
            } else {
                await createMovement(user.uid, {
                    type: 'expense',
                    subcategory: description || 'Gasto General',
                    amount: numericAmount,
                    date: format(date, 'yyyy-MM-dd'),
                    description: description || `Gasto proyecto: ${project.name}`,
                    entityId: finalEntityId,
                    categoryId: 'cat_expense_project', // Default ID or selector
                    category: category || 'Gastos de Proyecto',
                    box: 'Caja Principal', // Should customize?
                    projectId: project.id,
                    isFinancial: registerInFinance
                });

                await logProjectActivity(
                    project.id,
                    'expense_registered',
                    `Gasto registrado: $${numericAmount.toLocaleString('es-CL')}`,
                    user.uid,
                    user.displayName || 'Usuario'
                );
            }

            if (registerInFinance) {
                await refreshData();
            }
            onUpdate(); // Trigger parent refresh

            // Reset
            handleOpenChange(false);

        } catch (error) {
            console.error("Error saving expense:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (movementId: string) => {
        if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
        try {
            await deleteMovement(movementId);
            onUpdate();
            await refreshData();
        } catch (error) {
            console.error("Error deleting expense:", error);
        }
    };

    const handleEditClick = (m: Movement) => {
        setEditingMovement(m);
        setAmount(m.amount.toString());
        setDescription(m.description || m.subcategory || '');
        setDate(new Date(m.date + 'T12:00:00'));
        setCategory(m.category || '');
        setRegisterInFinance(m.isFinancial !== false);
        setIsDialogOpen(true);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setEditingMovement(null);
            setAmount('');
            setDescription('');
            setCategory('');
            setDate(new Date());
            setRegisterInFinance(true);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos del Proyecto</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Header Stats */}
                    <div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            ${totalExpenses.toLocaleString('es-CL')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total Gastos Registrados
                        </p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed">
                                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                Registrar Gasto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingMovement ? 'Editar Gasto' : 'Registrar Gasto'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSaveExpense} className="space-y-4 py-2">
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
                                    <Label>Concepto / Descripción</Label>
                                    <Input
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Ej. Hosting, Freelancer, Licencia..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Categoría (Opcional)</Label>
                                    <Input
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        placeholder="Ej. Software, Servicios..."
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="financial-exp"
                                        checked={registerInFinance}
                                        onCheckedChange={(checked) => setRegisterInFinance(!!checked)}
                                    />
                                    <Label htmlFor="financial-exp" className="text-sm font-medium leading-none">
                                        Registrar egreso en finanzas
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
                </div>

                {/* Expense List */}
                <div className="space-y-3 pt-4 border-t mt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial</h4>
                    {expenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <AlertCircle className="h-8 w-8 text-muted-foreground/20 mb-2" />
                            <p className="text-xs text-muted-foreground italic">No hay gastos registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {expenses.map((m) => (
                                <div key={m.id} className="flex items-center justify-between text-xs border p-2 rounded-md bg-muted/20 group hover:bg-muted/40 transition-colors">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">{m.description || m.subcategory}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground">{m.date}</span>
                                            {m.category && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-normal">
                                                    {m.category}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-red-600 mr-2">
                                            -${m.amount.toLocaleString('es-CL')}
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
            </CardContent>
        </Card>
    );
}
