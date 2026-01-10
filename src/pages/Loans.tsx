/**
 * Numia v1.0 - Loans Page
 */

import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getTodayLocalDateString } from '@/lib/utils';
import type { Loan, LoanType, MovementType } from '@/types';
import { Plus, Search, Filter, Trash2, Edit, Wallet, Calendar as CalendarIcon, CheckCircle2, XCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LoansProps {
  entityId?: string;
}

export function Loans({ entityId }: LoansProps = {}) {
  const { loans, entities, categories, createLoan, createMovement, updateLoan, deleteLoan, loading } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<typeof loans[0] | null>(null);
  const [paymentDialogLoan, setPaymentDialogLoan] = useState<typeof loans[0] | null>(null);

  // Handle URL params
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      if (searchParams.get('action') === 'create') {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('action');
          return newParams;
        });
      }
    }
  };
  const [formData, setFormData] = useState({
    type: 'lent' as LoanType,
    personName: '',
    amount: '',
    description: '',
    entityId: entityId || '',
    date: getTodayLocalDateString(),
    registerAsMovement: false,
    box: '',
  });

  // Update formData when entityId changes
  useEffect(() => {
    if (entityId) {
      setFormData(prev => ({ ...prev, entityId }));
    }
  }, [entityId]);

  // Filter loans by entity if provided
  const filteredLoans = entityId
    ? loans.filter(l => l.entityId === entityId)
    : loans;

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    note: '',
    date: getTodayLocalDateString(),
    box: '',
    registerAsMovement: false,
  });

  const [editFormData, setEditFormData] = useState({
    type: 'lent' as LoanType,
    personName: '',
    amount: '',
    description: '',
    date: getTodayLocalDateString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityId) {
      alert('Selecciona una entidad');
      return;
    }
    if (formData.registerAsMovement && !formData.box) {
      alert('Selecciona una caja para registrar el movimiento');
      return;
    }

    try {
      // Create loan
      await createLoan({
        type: formData.type,
        personName: formData.personName,
        amount: parseFloat(formData.amount),
        amountPaid: 0,
        description: formData.description,
        entityId: formData.entityId,
        date: formData.date,
        isPaid: false,
        payments: [],
      });

      // Create movement if checkbox is checked
      if (formData.registerAsMovement) {
        // lent → expense (money out), owe → income (money in)
        const movementType: MovementType = formData.type === 'lent' ? 'expense' : 'income';

        // Find "Préstamos" category for the movement type
        const loanCategory = categories.find(c =>
          c.type === movementType &&
          (c.name.toLowerCase() === 'préstamos' || c.name.toLowerCase() === 'prestamos')
        );

        if (!loanCategory) {
          alert('No se encontró la categoría "Préstamos". Por favor, créala antes de registrar movimientos de préstamos.');
          return;
        }

        await createMovement({
          type: movementType,
          amount: parseFloat(formData.amount),
          description: formData.description || `Préstamo ${formData.type === 'lent' ? 'a' : 'de'} ${formData.personName}`,
          categoryId: loanCategory.id,
          box: formData.box,
          entityId: formData.entityId,
          date: formData.date,
        });
      }

      handleOpenChange(false);
      setFormData({
        type: 'lent',
        personName: '',
        amount: '',
        description: '',
        entityId: '',
        date: getTodayLocalDateString(),
        registerAsMovement: false,
        box: '',
      });
    } catch (error) {
      console.error('Error creating loan:', error);
      alert('Error al crear préstamo');
    }
  };

  const handleDelete = async (loanId: string, loanDescription: string) => {
    const confirmation = prompt(
      `⚠️ ATENCIÓN: Estás a punto de eliminar el préstamo "${loanDescription}".\n\n` +
      `Esta acción NO se puede deshacer.\n\n` +
      `Para confirmar, escribe "ELIMINAR" (en mayúsculas):`
    );

    if (confirmation !== 'ELIMINAR') {
      if (confirmation !== null) {
        alert('Eliminación cancelada. Debes escribir exactamente "ELIMINAR" para confirmar.');
      }
      return;
    }

    try {
      await deleteLoan(loanId);
    } catch (error) {
      console.error('Error deleting loan:', error);
      alert('Error al eliminar préstamo');
    }
  };

  const handleEditClick = (loan: typeof loans[0]) => {
    setEditingLoan(loan);
    setEditFormData({
      type: loan.type,
      personName: loan.personName,
      amount: loan.amount.toString(),
      description: loan.description || '',
      date: loan.date,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan) return;

    try {
      await updateLoan(editingLoan.id, {
        type: editFormData.type,
        personName: editFormData.personName,
        amount: parseFloat(editFormData.amount),
        description: editFormData.description,
        date: editFormData.date,
      });

      setEditDialogOpen(false);
      setEditingLoan(null);
      setEditFormData({
        type: 'lent',
        personName: '',
        amount: '',
        description: '',
        date: getTodayLocalDateString(),
      });
    } catch (error) {
      console.error('Error updating loan:', error);
      alert('Error al actualizar préstamo');
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDialogLoan) return;

    const paymentAmount = parseFloat(paymentFormData.amount);
    if (paymentAmount <= 0) {
      alert('El monto del pago debe ser mayor a 0');
      return;
    }

    const pendingAmount = paymentDialogLoan.amount - paymentDialogLoan.amountPaid;
    if (paymentAmount > pendingAmount) {
      alert(`El monto del pago no puede exceder el monto pendiente (${formatCurrency(pendingAmount)})`);
      return;
    }

    if (paymentFormData.registerAsMovement && !paymentFormData.box) {
      alert('Selecciona una caja para registrar el movimiento');
      return;
    }

    try {
      // Create new payment entry
      const newPayment = {
        id: `payment_${Date.now()}`,
        amount: paymentAmount,
        date: paymentFormData.date,
        note: paymentFormData.note,
        createdAt: new Date(),
      };

      // Update loan with new payment
      const updatedPayments = [...paymentDialogLoan.payments, newPayment];
      const updatedAmountPaid = paymentDialogLoan.amountPaid + paymentAmount;
      const isFullyPaid = updatedAmountPaid >= paymentDialogLoan.amount;

      await updateLoan(paymentDialogLoan.id, {
        payments: updatedPayments,
        amountPaid: updatedAmountPaid,
        isPaid: isFullyPaid,
      });

      // Create movement if checkbox is checked
      if (paymentFormData.registerAsMovement) {
        // lent → income (money in), owe → expense (money out)
        const movementType: MovementType = paymentDialogLoan.type === 'lent' ? 'income' : 'expense';

        // Find "Préstamos" category for the movement type
        const loanCategory = categories.find(c =>
          c.type === movementType &&
          (c.name.toLowerCase() === 'préstamos' || c.name.toLowerCase() === 'prestamos')
        );

        if (!loanCategory) {
          alert('No se encontró la categoría "Préstamos". El pago se registró pero no se creó el movimiento.');
        } else {
          await createMovement({
            type: movementType,
            amount: paymentAmount,
            description: paymentFormData.note || `Pago de préstamo ${paymentDialogLoan.type === 'lent' ? 'de' : 'a'} ${paymentDialogLoan.personName}`,
            categoryId: loanCategory.id,
            box: paymentFormData.box,
            entityId: paymentDialogLoan.entityId,
            date: paymentFormData.date,
          });
        }
      }

      // Reset form and close dialog
      setPaymentDialogLoan(null);
      setPaymentFormData({
        amount: '',
        note: '',
        date: getTodayLocalDateString(),
        box: '',
        registerAsMovement: false,
      });
    } catch (error) {
      console.error('Error registering payment:', error);
      alert('Error al registrar pago');
    }
  };

  // Calculate totals
  const lentLoans = filteredLoans.filter(l => l.type === 'lent');
  const oweLoans = filteredLoans.filter(l => l.type === 'owe');

  const activeLentLoans = lentLoans.filter(l => !l.isPaid);
  const activeOweLoans = oweLoans.filter(l => !l.isPaid);
  const completedLoans = loans.filter(l => l.isPaid);
  const activeLoans = [...activeLentLoans, ...activeOweLoans];

  const totalLent = lentLoans.reduce((sum, l) => sum + (l.amount - (l.amountPaid || 0)), 0);
  const totalOwe = oweLoans.reduce((sum, l) => sum + (l.amount - (l.amountPaid || 0)), 0);

  // Calculate overall progress
  const totalAmount = filteredLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalPaid = filteredLoans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);
  const overallProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  // Calculate progress for lent and owe
  const totalLentAmount = lentLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalLentPaid = lentLoans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);
  const lentProgress = totalLentAmount > 0 ? (totalLentPaid / totalLentAmount) * 100 : 0;

  const totalOweAmount = oweLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalOwePaid = oweLoans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);
  const oweProgress = totalOweAmount > 0 ? (totalOwePaid / totalOweAmount) * 100 : 0;

  // Render loan card
  const renderLoanCard = (loan: typeof loans[0]) => {
    const entity = entities.find(e => e.id === loan.entityId);
    const isLent = loan.type === 'lent';

    return (
      <Card key={loan.id} className={loan.isPaid ? 'opacity-50' : ''}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{loan.personName}</p>
              <p className="text-xs text-muted-foreground">
                {entity?.icon} {entity?.name}
              </p>
            </div>
            <div className="flex gap-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleEditClick(loan)}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => handleDelete(loan.id, loan.personName)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className={`text-2xl font-bold ${isLent ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
              {formatCurrency(loan.amount)}
            </p>
            {loan.amountPaid > 0 && (
              <p className="text-xs text-muted-foreground">
                Pagado: {formatCurrency(loan.amountPaid)}
              </p>
            )}
          </div>

          {/* Description */}
          {loan.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{loan.description}</p>
          )}

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progreso</span>
              <span className="text-xs font-medium">
                {Math.round((loan.amountPaid / loan.amount) * 100)}%
              </span>
            </div>
            <Progress value={(loan.amountPaid / loan.amount) * 100} className="h-1.5" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-xs text-muted-foreground">
              {new Date(loan.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
            </p>
            {loan.isPaid ? (
              <Badge variant="secondary" className="text-xs">Pagado</Badge>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => setPaymentDialogLoan(loan)}
              >
                Pagar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Préstamos</h1>
          <p className="text-muted-foreground">Gestiona lo que debes y lo que te deben</p>
        </div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="icon" className="md:w-auto md:px-4 md:py-2">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Nuevo Préstamo</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
              <DialogDescription>
                Registra dinero que has prestado a alguien o que alguien te ha prestado
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!entityId && (
                <div>
                  <Label htmlFor="entity">Entidad</Label>
                  <Select value={formData.entityId} onValueChange={(value) => setFormData({ ...formData, entityId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una entidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value: LoanType) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lent">💸 Me deben (presté dinero)</SelectItem>
                    <SelectItem value="owe">🤝 Debo (me prestaron dinero)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="personName">Persona</Label>
                <Input
                  id="personName"
                  value={formData.personName}
                  onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                  placeholder="Nombre de la persona"
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Motivo del préstamo"
                />
              </div>
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              {/* Optional Movement Registration */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="registerAsMovement"
                    checked={formData.registerAsMovement}
                    onCheckedChange={(checked) => setFormData({ ...formData, registerAsMovement: !!checked })}
                  />
                  <Label htmlFor="registerAsMovement" className="text-sm font-normal cursor-pointer">
                    Registrar como movimiento
                  </Label>
                </div>

                {formData.registerAsMovement && formData.entityId && (
                  <div>
                    <Label htmlFor="box">Caja</Label>
                    <Select value={formData.box} onValueChange={(value) => setFormData({ ...formData, box: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una caja" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(entities.find(e => e.id === formData.entityId)?.boxes || {}).map((box) => (
                          <SelectItem key={box} value={box}>
                            {box}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* General Progress Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <CardTitle>Progreso General de Préstamos</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {completedLoans.length} completados • {activeLoans.length} activos • {loans.length} total
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-500">{Math.round(overallProgress)}%</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>💸</span>
              Me deben
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">
                {formatCurrency(totalLent)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {activeLentLoans.length} préstamos activos
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Progreso de cobro</span>
                <span className="text-xs font-medium">{Math.round(lentProgress)}%</span>
              </div>
              <Progress value={lentProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🤝</span>
              Debo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-500">
                {formatCurrency(totalOwe)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {activeOweLoans.length} préstamos activos
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Progreso de pago</span>
                <span className="text-xs font-medium">{Math.round(oweProgress)}%</span>
              </div>
              <Progress value={oweProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div>Cargando...</div>
      ) : filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🤝</div>
            <h3 className="text-lg font-semibold mb-2">No hay préstamos registrados</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Registra préstamos que hayas hecho o que te hayan hecho
            </p>
            <Button onClick={() => setIsOpen(true)} disabled={entities.length === 0}>
              {entities.length === 0 ? 'Crea una entidad primero' : '+ Nuevo Préstamo'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="todos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="todos">Todos ({filteredLoans.length})</TabsTrigger>
            <TabsTrigger value="activos">Activos ({activeLoans.length})</TabsTrigger>
            <TabsTrigger value="completados">Completados ({completedLoans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredLoans.map(renderLoanCard)}
            </div>
          </TabsContent>

          <TabsContent value="activos" className="mt-4">
            {activeLoans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">No hay préstamos activos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activeLoans.map(renderLoanCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completados" className="mt-4">
            {completedLoans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">No hay préstamos completados</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {completedLoans.map(renderLoanCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Payment Registration Dialog */}
      <Dialog open={!!paymentDialogLoan} onOpenChange={(open) => !open && setPaymentDialogLoan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {paymentDialogLoan && (
                <>
                  Registra un pago {paymentDialogLoan.type === 'lent' ? 'recibido de' : 'realizado a'} {paymentDialogLoan.personName}
                  <br />
                  <span className="font-medium">
                    Monto pendiente: {formatCurrency(paymentDialogLoan.amount - paymentDialogLoan.amountPaid)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterPayment} className="space-y-4">
            <div>
              <Label htmlFor="paymentAmount">Monto del pago</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                placeholder="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <Label htmlFor="paymentDate">Fecha del pago</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentFormData.date}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="paymentNote">Nota (opcional)</Label>
              <Input
                id="paymentNote"
                value={paymentFormData.note}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, note: e.target.value })}
                placeholder="Ej: Pago parcial 1/3"
              />
            </div>

            {/* Optional Movement Registration */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="registerPaymentAsMovement"
                  checked={paymentFormData.registerAsMovement}
                  onCheckedChange={(checked) => setPaymentFormData({ ...paymentFormData, registerAsMovement: !!checked })}
                />
                <Label htmlFor="registerPaymentAsMovement" className="text-sm font-normal cursor-pointer">
                  Registrar pago como movimiento
                </Label>
              </div>

              {paymentFormData.registerAsMovement && paymentDialogLoan && (
                <div>
                  <Label htmlFor="paymentBox">Caja</Label>
                  <Select value={paymentFormData.box} onValueChange={(value) => setPaymentFormData({ ...paymentFormData, box: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una caja" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(entities.find(e => e.id === paymentDialogLoan.entityId)?.boxes || {}).map((box) => (
                        <SelectItem key={box} value={box}>
                          {box}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setPaymentDialogLoan(null)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Pago</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Loan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Préstamo</DialogTitle>
            <DialogDescription>
              Modifica los datos del préstamo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="editType">Tipo</Label>
              <Select value={editFormData.type} onValueChange={(value: LoanType) => setEditFormData({ ...editFormData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lent">💸 Me deben (presté dinero)</SelectItem>
                  <SelectItem value="owe">🤝 Debo (me prestaron dinero)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editPersonName">Persona</Label>
              <Input
                id="editPersonName"
                value={editFormData.personName}
                onChange={(e) => setEditFormData({ ...editFormData, personName: e.target.value })}
                placeholder="Nombre de la persona"
                required
              />
            </div>
            <div>
              <Label htmlFor="editAmount">Monto</Label>
              <Input
                id="editAmount"
                type="number"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Descripción (opcional)</Label>
              <Input
                id="editDescription"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Motivo del préstamo"
              />
            </div>
            <div>
              <Label htmlFor="editDate">Fecha</Label>
              <Input
                id="editDate"
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

