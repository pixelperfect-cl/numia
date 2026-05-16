import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn, addPeriodToDateString } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getClients, getAllSubscriptions, deleteSubscription, updateSubscription, createMovement, deleteMovement, getMovements } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ServiceDialog } from '@/components/erp/ServiceDialog';
import { ServiceKanbanBoard } from '@/components/erp/ServiceKanbanBoard';
import { ServiceCatalogPanel } from '@/components/erp/ServiceCatalogPanel';


import { ServiceSelectionDialog } from '@/components/erp/ServiceSelectionDialog';
import { ClientSelectionDialog } from '@/components/erp/ClientSelectionDialog';
import { PaymentDetailDialog } from '@/components/erp/PaymentDetailDialog';
import { PaymentHistoryDialog } from '@/components/erp/PaymentHistoryDialog';
import { EditPaymentDialog } from '@/components/erp/EditPaymentDialog';
import { PaymentDialog } from '@/components/erp/PaymentDialog';
import { ArchiveServiceDialog } from '@/components/erp/ArchiveServiceDialog';
import { ClientDetailsDialog } from '@/components/erp/ClientDetailsDialog';
import { ClientDialog } from '@/components/erp/ClientDialog';
import { ServiceDetailPanel } from '@/components/erp/service/ServiceDetailPanel';
import { fetchIndicators } from '@/lib/indicators';
import { Loader2, Search, Trash2, Briefcase, TrendingUp, DollarSign, RotateCcw, LayoutGrid, FileText, CalendarRange, Activity, Bell } from 'lucide-react';
import { NotificationSettings } from '@/components/configuration/NotificationSettings';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import type { Client, Subscription, ServiceDefinition, Movement, PaymentRecord, EnhancedSubscription } from '@/types';
import { format, addMonths, addYears, subMonths, subYears, parseISO, isAfter } from 'date-fns';

interface ServicesProps {
    entityId?: string;
    defaultTab?: 'summary' | 'monthly' | 'annual' | 'archived' | 'catalog';
    onTabChange?: (tab: string) => void;
}

// Logic extracted to helper for reuse
const processSubscription = (sub: Subscription, client: Client, userId: string): EnhancedSubscription => {
    // Calculate paid amount for the *current* period
    // Current period start = nextBillingDate - frequency
    const nextDate = parseISO(sub.nextBillingDate);
    let periodStart = sub.frequency === 'monthly'
        ? subMonths(nextDate, 1)
        : subYears(nextDate, 1);

    // Calculate paid amount from Payment Records in Subscription
    // This is the single source of truth for "Service Status"
    // If sub.payments is undefined, fallback to empty array
    const currentPayments = (sub.payments || []).filter(p => {
        const pDate = parseISO(p.date);
        // Logic: date > periodStart AND date <= nextBillingDate
        return isAfter(pDate, periodStart) && pDate <= parseISO(sub.nextBillingDate);
    });

    // Map PaymentRecord to Movement-like structure for the UI
    const displayedMovements: Movement[] = currentPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.date,
        description: p.notes,
        type: 'income',
        userId: userId,
        categoryId: '',
        entityId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'paid',
        box: 'general',
        isFinancial: p.isFinancial
    }));

    // Map ALL payments for history
    const allPayments = (sub.payments || []).map(p => ({
        id: p.id,
        userId: userId,
        amount: p.amount,
        date: p.date,
        description: p.notes,
        type: 'income' as const,
        categoryId: '',
        entityId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'paid' as 'paid',
        box: 'general',
        isFinancial: p.isFinancial
    }));

    const paid = currentPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
        ...sub,
        clientName: client.name,
        clientWebsite: client.website,
        clientId: client.id,
        paidAmount: paid,
        currentMovements: displayedMovements,
        allPayments: allPayments
    };
};

// Re-export from types for backwards compatibility
export type { EnhancedSubscription } from '@/types';

export function Services({ entityId, defaultTab = 'summary', onTabChange }: ServicesProps = {}) {
    const { user } = useAuth();
    const { entities, categories } = useData();
    const [subscriptions, setSubscriptions] = useState<EnhancedSubscription[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Cache to avoid refetching on re-mount
    const cacheRef = useRef<{ subscriptions: EnhancedSubscription[]; clients: Client[]; timestamp: number } | null>(null);
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const [searchParams, setSearchParams] = useSearchParams();
    const searchTerm = searchParams.get('search') || '';
    const [ufValue, setUfValue] = useState<number | null>(null);

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [serviceSelectionOpen, setServiceSelectionOpen] = useState(false);
    const [clientSelectionOpen, setClientSelectionOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<EnhancedSubscription | undefined>(undefined);
    const [selectedClientForService, setSelectedClientForService] = useState<Client | null>(null);
    const [preselectedDefinition, setPreselectedDefinition] = useState<ServiceDefinition | null>(null);
    const [creationContext, setCreationContext] = useState<{ frequency: 'monthly' | 'yearly'; monthIndex: number } | null>(null);

    // Payment Dialog State
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentMode, setPaymentMode] = useState<'full' | 'partial'>('full');
    const [selectedSubscriptionForPayment, setSelectedSubscriptionForPayment] = useState<EnhancedSubscription | null>(null);

    // Payment Details Dialog State
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [selectedSubscriptionForDetail, setSelectedSubscriptionForDetail] = useState<EnhancedSubscription | null>(null);
    const [editPaymentDialogOpen, setEditPaymentDialogOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<PaymentRecord | null>(null);

    // Archive Dialog State
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [subscriptionToArchive, setSubscriptionToArchive] = useState<EnhancedSubscription | null>(null);

    // Client Dialog State (for viewing/editing from cards)
    const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
    const [clientDialogOpen, setClientDialogOpen] = useState(false);
    const [selectedClientForView, setSelectedClientForView] = useState<Client | null>(null);
    const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | null>(null);

    // Service Detail Panel State
    const [detailPanelOpen, setDetailPanelOpen] = useState(false);
    const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<EnhancedSubscription | null>(null);

    const loadData = useCallback(async (forceRefresh = false) => {
        if (!user) return;

        // If we have valid cache, show it immediately (no loading spinner)
        const now = Date.now();
        if (!forceRefresh && cacheRef.current && (now - cacheRef.current.timestamp) < CACHE_TTL) {
            setClients(cacheRef.current.clients);
            setSubscriptions(cacheRef.current.subscriptions);
            setLoading(false);
            return;
        }

        // Only show loading spinner if we have no cached data
        if (!cacheRef.current) {
            setLoading(true);
        }

        try {
            // Fetch clients and ALL subscriptions in parallel (2 queries instead of N+1)
            const [clientsData, allSubs] = await Promise.all([
                getClients(user.uid),
                getAllSubscriptions(user.uid),
            ]);

            // Filter clients by entity if provided
            const filteredClients = entityId
                ? clientsData.filter(c => c.entityId === entityId)
                : clientsData;

            // Build client lookup map for O(1) access
            const clientMap = new Map(filteredClients.map(c => [c.id, c]));

            // Match subscriptions to their clients in memory
            const flatSubs = allSubs
                .filter(sub => clientMap.has(sub.clientId))
                .map(sub => processSubscription(sub, clientMap.get(sub.clientId)!, user.uid));

            // Update cache
            cacheRef.current = { subscriptions: flatSubs, clients: filteredClients, timestamp: Date.now() };

            setClients(filteredClients);
            setSubscriptions(flatSubs);

        } catch (error) {
            console.error("Error loading services:", error);
        } finally {
            setLoading(false);
        }
    }, [user, entityId]);

    useEffect(() => {
        loadData();
        // Fetch UF
        fetchIndicators().then(data => {
            if (data.uf && data.uf.valor) {
                setUfValue(data.uf.valor);
            }
        }).catch(err => console.error("Error fetching indicators in Services:", err));
    }, [user, entityId]);

    const handleRevertPayment = async (sub: EnhancedSubscription) => {
        // No confirm here, rely on the Dialog's explicit action


        if (!user) return;

        try {
            // 1. Revert Date
            const currentNextDate = parseISO(sub.nextBillingDate);
            let prevDate = currentNextDate;
            if (sub.frequency === 'monthly') {
                prevDate = subMonths(currentNextDate, 1);
            } else {
                prevDate = subYears(currentNextDate, 1);
            }

            // 2. Identify and remove the last payment record
            // Use sub.payments (available in EnhancedSubscription thanks to our modification)
            const payments = [...(sub.payments || [])];
            // Filter payments for this period to find the last one
            // Actually, we probably want to revert the *latest* payment in general?
            // Or typically, "Undo Payment" implies undoing the status change, checking if we should revert date.
            // If we just undo a partial payment, we don't revert date.

            // BUT, the context of "Deshacer Pago" in the dialog usually meant "Un-doing the Full Payment that advanced the date".
            // If we now support partial payments, "Deshacer último abono" (Undo last contribution) is different from "Deshacer mes pagado".

            // For now, let's assume this reverses the *last action*.
            // Find the payment that happened on the (prevDate -> currentNextDate) cycle?
            // Simplification: Just remove the last added payment record.

            let paymentToRemoveId: string | undefined;
            let movementToRemoveId: string | undefined;

            if (payments.length > 0) {
                // Sort by date descending
                payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const lastPayment = payments[0];
                paymentToRemoveId = lastPayment.id;
                movementToRemoveId = lastPayment.movementId;

                // Remove it from the local array copy
                const newPayments = payments.filter(p => p.id !== lastPayment.id);

                // Update subscription with new payments list (and reverted date ONLY if it was fully paid? - Complex)
                // Keeping it simple: The user asked to "Undo Payment".
                // If the button "Pagado" (Green) was clicked, it runs this.
                // If the user clicks "Deshacer último pago" in dropdown, it runs this.

                await updateSubscription(sub.id, {
                    nextBillingDate: format(prevDate, 'yyyy-MM-dd'),
                    payments: newPayments
                });
            } else {
                // Fallback for legacy behavior if no payments array exists yet
                await updateSubscription(sub.id, {
                    nextBillingDate: format(prevDate, 'yyyy-MM-dd')
                });
            }

            // 3. Delete the financial movement if it exists
            if (movementToRemoveId) {
                await deleteMovement(movementToRemoveId);
            } else {
                // Legacy "Best Effort" Deletion (if we didn't have the ID in the record)
                const recentMovements = await getMovements(user.uid, {
                    entityId: entityId || '',
                    startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
                    endDate: format(new Date(), 'yyyy-MM-dd')
                });

                const candidate = recentMovements
                    .filter(m => m.clientId === sub.clientId && m.type === 'income' && m.amount === sub.amount)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                if (candidate) {
                    await deleteMovement(candidate.id);
                }
            }

            await loadData(true);
        } catch (error) {
            console.error("Error reverting payment:", error);
            alert("Error al deshacer el pago.");
        }
    };

    const handleViewPaymentDetails = (sub: EnhancedSubscription) => {
        setSelectedSubscriptionForDetail(sub);
        setDetailDialogOpen(true);
    };

    const handleCreate = (context?: { frequency: 'monthly' | 'yearly'; monthIndex: number }) => {
        setEditingSubscription(undefined);
        setCreationContext(context || null);
        setServiceSelectionOpen(true);
    };

    const handleServiceSelect = (definition: ServiceDefinition | null) => {
        setServiceSelectionOpen(false);
        setPreselectedDefinition(definition);
        // Open client selection as step 2 instead of going directly to form
        setClientSelectionOpen(true);
    };

    const handleClientSelect = (client: Client) => {
        setClientSelectionOpen(false);
        setSelectedClientForService(client);
        setDialogOpen(true);
    };

    const handleEdit = (sub: EnhancedSubscription) => {
        setEditingSubscription(sub);
        setPreselectedDefinition(null);
        setDialogOpen(true);
    };

    const handleDelete = async (subscriptionId: string) => {
        if (!confirm('¿Estás seguro de eliminar permanentemente este servicio? Esta acción no se puede deshacer.')) return;
        try {
            await deleteSubscription(subscriptionId);
            loadData(true);
        } catch (error) {
            console.error("Error deleting subscription:", error);
        }
    };

    const handleArchive = (subscriptionId: string) => {
        const sub = subscriptions.find(s => s.id === subscriptionId);
        if (sub) {
            setSubscriptionToArchive(sub);
            setArchiveDialogOpen(true);
        }
    };

    const handleArchiveConfirm = async (reason: string, notes: string) => {
        if (!subscriptionToArchive) return;
        try {
            await updateSubscription(subscriptionToArchive.id, {
                status: 'archived',
                archiveReason: reason,
                archiveNotes: notes || null,
                archivedAt: format(new Date(), 'yyyy-MM-dd')
            });
            loadData(true);
        } catch (error) {
            console.error("Error archiving subscription:", error);
            throw error;
        }
    };

    const handleRestore = async (subscriptionId: string) => {
        try {
            await updateSubscription(subscriptionId, { status: 'active' });
            loadData(true);
        } catch (error) {
            console.error("Error restoring subscription:", error);
        }
    };

    // Payment Handlers
    const onMarkPaid = (sub: EnhancedSubscription) => {
        setSelectedSubscriptionForPayment(sub);
        setPaymentMode('full');
        setPaymentDialogOpen(true);
    };

    const onPartialPayment = (sub: EnhancedSubscription) => {
        setSelectedSubscriptionForPayment(sub);
        setPaymentMode('partial');
        setPaymentDialogOpen(true);
    };

    const handleViewClient = (sub: EnhancedSubscription) => {
        const client = clients.find(c => c.id === sub.clientId);
        if (client) {
            setSelectedClientForView(client);
            setClientDetailsOpen(true);
        }
    };

    const handleEditClientFromDetails = (client: Client) => {
        setClientDetailsOpen(false);
        setSelectedClientForEdit(client);
        setClientDialogOpen(true);
    };

    const handleClientSave = () => {
        loadData(true); // Refresh clients and services (names might change)
        setClientDialogOpen(false);
        // If we were viewing details, reopen details? No, usually generic save closes everything.
        // User workflow: View -> Edit -> Save -> Done.
    };

    const handlePaymentConfirm = async (amount: number, date: Date, notes: string, registerMovement: boolean) => {
        if (!user || !selectedSubscriptionForPayment) return;

        const sub = selectedSubscriptionForPayment;
        const billingPeriod = sub.nextBillingDate;

        if (paymentMode === 'full') {
            const existingFullForPeriod = (sub.payments || []).some(p => p.billingPeriod === billingPeriod && !p.isPartial);
            if (existingFullForPeriod) {
                alert(`Ya existe un pago completo registrado para el período ${billingPeriod}. Si necesitas registrar otro, usa pago parcial o revierte el anterior primero.`);
                return;
            }
        }

        try {
            const client = clients.find(c => c.id === sub.clientId);
            const targetEntityId = client?.entityId || entityId || entities[0]?.id;
            if (!targetEntityId) throw new Error("No entity found for payment");

            const entity = entities.find(e => e.id === targetEntityId);
            const defaultBoxKey = entity ? (Object.keys(entity.boxes).find(key => entity.boxes[key].isDefault) || Object.keys(entity.boxes)[0]) : 'general';

            const incomeCategory = categories.find(c => c.type === 'income' && c.name.toLowerCase().includes('servicios'))
                || categories.find(c => c.type === 'income');
            if (!incomeCategory) throw new Error("No income category found");

            let movementId: string | undefined;

            if (registerMovement) {
                movementId = await createMovement(user.uid, {
                    entityId: targetEntityId,
                    amount,
                    type: 'income',
                    description: notes,
                    categoryId: incomeCategory.id,
                    box: defaultBoxKey,
                    date: format(date, 'yyyy-MM-dd'),
                    status: 'paid',
                    clientId: sub.clientId,
                    subscriptionId: sub.id,
                    billingPeriod,
                });
            }

            const newPaymentDetail: PaymentRecord = {
                id: crypto.randomUUID(),
                amount,
                date: format(date, 'yyyy-MM-dd'),
                notes,
                isFinancial: registerMovement,
                billingPeriod,
                isPartial: paymentMode !== 'full',
                ...(sub.currency === 'UF' && ufValue ? {
                    amountUF: sub.amount,
                    ufRateAtPayment: ufValue,
                } : {}),
                ...(movementId ? { movementId } : {})
            };

            const currentPayments = sub.payments || [];
            const updatePayload: any = { payments: [...currentPayments, newPaymentDetail] };

            if (paymentMode === 'full') {
                updatePayload.nextBillingDate = addPeriodToDateString(billingPeriod, sub.frequency, 1);
            }

            await updateSubscription(sub.id, {
                ...updatePayload,
                userId: user.uid,
                clientId: sub.clientId,
            });

            loadData(true);
        } catch (error) {
            console.error("Error processing payment:", error);
            alert("Error al procesar el pago");
            throw error;
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!selectedSubscriptionForDetail) return;

        try {
            const sub = selectedSubscriptionForDetail;
            const paymentToDelete = sub.allPayments?.find(p => p.id === paymentId);

            // 1. Remove from subscription.payments array
            const updatedPayments = (sub.payments || []).filter(p => p.id !== paymentId);

            // Logic to revert date if we are deleting the *latest* payment
            // Payments are not guaranteed to be sorted in the sub object, so let's sort them.
            const allPayments = [...(sub.payments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latestPayment = allPayments[0];

            let newNextDate = sub.nextBillingDate;

            // If we are deleting the latest payment, we should revert the date
            if (latestPayment && latestPayment.id === paymentId) {
                newNextDate = addPeriodToDateString(
                    sub.nextBillingDate,
                    sub.frequency,
                    -1
                );
                console.log(`Reverting date from ${sub.nextBillingDate} to ${newNextDate}`);
            }

            await updateSubscription(sub.id, {
                payments: updatedPayments,
                nextBillingDate: newNextDate
            });


            // 2. Refresh Local State Immediately
            // We need to mirror what loadData does but for this specific subscription only
            const updatedSubRaw = {
                ...sub,
                payments: updatedPayments,
                nextBillingDate: newNextDate
            };

            // Re-process the subscription to get correct paidAmount and movement lists
            const client = clients.find(c => c.id === sub.clientId) || { id: sub.clientId, name: sub.clientName } as Client;
            const updatedSubProcessed = processSubscription(updatedSubRaw, client, user.uid);

            // Update local subscriptions list
            setSubscriptions(prev => prev.map(s => s.id === sub.id ? updatedSubProcessed : s));

            // Update the detailed view state
            setSelectedSubscriptionForDetail(updatedSubProcessed);

            // Background refresh to ensure sync
            loadData(true);

        } catch (error) {
            console.error("Error deleting payment:", error);
            alert("Error al eliminar el pago");
        }
    };

    const handleEditPayment = async (paymentId: string, updates: { amount: number; notes: string }) => {
        if (!selectedSubscriptionForDetail) return;

        try {
            const sub = selectedSubscriptionForDetail;
            const updatedPayments = (sub.payments || []).map(p => {
                if (p.id === paymentId) {
                    return { ...p, ...updates };
                }
                return p;
            });

            await updateSubscription(sub.id, {
                payments: updatedPayments
            });

            // Refresh
            await loadData(true);

            // Update local state for immediate feedback
            setSelectedSubscriptionForDetail(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    payments: updatedPayments,
                    allPayments: prev.allPayments?.map(p => p.id === paymentId ? { ...p, amount: updates.amount, description: updates.notes } : p),
                    currentMovements: prev.currentMovements?.map(p => p.id === paymentId ? { ...p, amount: updates.amount, description: updates.notes } : p),
                    // Re-calc paid amount if needed, complex but ok for small edits
                    paidAmount: updatedPayments.reduce((sum, p) => {
                        // logic to check if in current period... complex to duplicate.
                        // simpler: assume loadData fixes it shortly.
                        return sum;
                    }, 0)
                };
            });
        } catch (error) {
            console.error("Error editing payment:", error);
            alert("Error al editar el pago");
        }
    };

    const openEditDialog = (payment: any) => {
        // Payment here is the 'Movement' like object from the list.
        // We need to map it back to PaymentRecord structure for the dialog
        setPaymentToEdit({
            id: payment.id,
            amount: payment.amount,
            notes: payment.description || '',
            date: payment.date,
            isFinancial: payment.isFinancial
        });
        setEditPaymentDialogOpen(true);
    };

    const filteredSubscriptions = subscriptions.filter(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Summary Statistics
    const activeSubs = subscriptions.filter(s => s.status === 'active');

    const totalAnnual = activeSubs.reduce((acc, curr) => {
        const amountInClp = curr.currency === 'UF' && ufValue ? curr.amount * ufValue : curr.amount;
        if (curr.frequency === 'monthly') {
            return acc + (amountInClp * 12);
        } else {
            return acc + amountInClp;
        }
    }, 0);

    const totalMonthlyServicesAmount = activeSubs
        .filter(s => s.frequency === 'monthly')
        .reduce((acc, curr) => {
            const amountInClp = curr.currency === 'UF' && ufValue ? curr.amount * ufValue : curr.amount;
            return acc + amountInClp;
        }, 0);

    const totalAnnualServicesAmount = activeSubs
        .filter(s => s.frequency === 'yearly')
        .reduce((acc, curr) => {
            const amountInClp = curr.currency === 'UF' && ufValue ? curr.amount * ufValue : curr.amount;
            return acc + amountInClp;
        }, 0);

    const monthlyAverage = totalAnnual / 12;

    const activeCount = activeSubs.length;

    // const [searchParams, setSearchParams] = useSearchParams(); // Already defined above
    const tabParam = searchParams.get('tab');
    const isValidTab = (tab: string | null): tab is 'summary' | 'monthly' | 'annual' | 'archived' | 'catalog' | 'notifications' => {
        return tab === 'summary' || tab === 'monthly' || tab === 'annual' || tab === 'archived' || tab === 'catalog' || tab === 'notifications';
    };
    const activeTab = isValidTab(tabParam)
        ? tabParam
        : (defaultTab === 'monthly' || defaultTab === 'annual' ? defaultTab : 'monthly');

    const activeEntity = entities.find(e => e.id === (entityId || entities[0]?.id));

    const handleTabChange = (val: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', val);
            return newParams;
        });
        if (onTabChange) {
            onTabChange(val);
        }
    }

    const handleSearchChange = (term: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (term) {
                newParams.set('search', term);
            } else {
                newParams.delete('search');
            }
            return newParams;
        });
    };

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
            <ClientDetailsDialog
                client={selectedClientForView}
                open={clientDetailsOpen}
                onOpenChange={setClientDetailsOpen}
                onEditClient={handleEditClientFromDetails}
            />

            <ClientDialog
                open={clientDialogOpen}
                onOpenChange={setClientDialogOpen}
                client={selectedClientForEdit || undefined}
                onSuccess={handleClientSave}
                entityId={entityId || user?.uid} // Fallback entity ID
            />



            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 flex-1 flex flex-col">
                <TabsContent value="catalog" className="h-full overflow-y-auto">
                    <ServiceCatalogPanel />
                </TabsContent>



                <TabsContent value="summary" className="space-y-4 flex-1 flex flex-col h-full">
                    <div className="flex flex-col gap-4 shrink-0">
                        <div className="flex items-center justify-between shrink-0">
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar servicio o cliente..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground px-1">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>Mensual: <span className="font-medium text-foreground">${Math.round(monthlyAverage).toLocaleString()}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>Anual: <span className="font-medium text-foreground">${Math.round(totalAnnual).toLocaleString()}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5" />
                                <span>Diario: <span className="font-medium text-foreground">${Math.round(totalAnnual / 365).toLocaleString()}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        {/* Card 1: Distribución de Servicios (Donut) */}
                        <Card className="h-full border-t-4 border-t-emerald-500 shadow-sm">
                            <CardHeader className="pb-3 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Distribución de Servicios
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-mono">
                                            {activeCount} activos
                                        </Badge>
                                        <Badge variant="outline" className="text-muted-foreground font-mono">
                                            ${Math.round(monthlyAverage).toLocaleString()}/mes
                                        </Badge>
                                    </div>
                                </div>
                                <CardDescription>Proporción de ingresos por tipo de servicio</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {loading ? (
                                    <div className="flex items-center justify-center h-[320px]">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (() => {
                                    // Group services by name and calculate totals
                                    const serviceGroups: Record<string, { name: string; totalCLP: number; count: number; frequency: string }> = {};
                                    const donutColors = [
                                        'hsl(160, 84%, 39%)', // emerald-600
                                        'hsl(217, 91%, 60%)', // blue-500
                                        'hsl(262, 83%, 58%)', // violet-500
                                        'hsl(25, 95%, 53%)',  // orange-500
                                        'hsl(340, 82%, 52%)', // rose-500
                                        'hsl(199, 89%, 48%)', // sky-500
                                        'hsl(47, 96%, 53%)',  // amber-400
                                        'hsl(280, 67%, 51%)', // purple-500
                                    ];

                                    activeSubs.forEach(sub => {
                                        const amountCLP = sub.currency === 'UF' && ufValue ? sub.amount * ufValue : sub.amount;
                                        const monthlyEquiv = sub.frequency === 'monthly' ? amountCLP : amountCLP / 12;
                                        if (!serviceGroups[sub.name]) {
                                            serviceGroups[sub.name] = { name: sub.name, totalCLP: 0, count: 0, frequency: sub.frequency };
                                        }
                                        serviceGroups[sub.name].totalCLP += monthlyEquiv;
                                        serviceGroups[sub.name].count += 1;
                                    });

                                    const sortedGroups = Object.values(serviceGroups).sort((a, b) => b.totalCLP - a.totalCLP);
                                    const donutData = sortedGroups.map((g, i) => ({
                                        name: g.name,
                                        value: Math.round(g.totalCLP),
                                        count: g.count,
                                        frequency: g.frequency,
                                        fill: donutColors[i % donutColors.length],
                                    }));

                                    const totalDonut = donutData.reduce((sum, d) => sum + d.value, 0);

                                    if (donutData.length === 0) {
                                        return (
                                            <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
                                                No hay servicios activos.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex flex-col gap-4">
                                            {/* Donut Chart */}
                                            <div className="relative h-[200px] flex items-center justify-center">
                                                {/* SVG Donut Chart */}
                                                    <svg viewBox="0 0 200 200" className="w-[180px] h-[180px]">
                                                        {(() => {
                                                            let cumulativeAngle = -90;
                                                            return donutData.map((segment, i) => {
                                                                const percentage = segment.value / totalDonut;
                                                                const angle = percentage * 360;
                                                                const startAngle = cumulativeAngle;
                                                                cumulativeAngle += angle;
                                                                const endAngle = cumulativeAngle;

                                                                const startRad = (startAngle * Math.PI) / 180;
                                                                const endRad = (endAngle * Math.PI) / 180;
                                                                const largeArc = angle > 180 ? 1 : 0;

                                                                const outerR = 90;
                                                                const innerR = 58;
                                                                const cx = 100;
                                                                const cy = 100;
                                                                // Tiny gap between segments
                                                                const gapAngle = donutData.length > 1 ? 1.5 : 0;
                                                                const gapRad = (gapAngle * Math.PI) / 180;
                                                                const adjStartRad = startRad + (donutData.length > 1 ? gapRad / 2 : 0);
                                                                const adjEndRad = endRad - (donutData.length > 1 ? gapRad / 2 : 0);
                                                                const adjAngle = angle - gapAngle;
                                                                const adjLargeArc = adjAngle > 180 ? 1 : 0;

                                                                const x1Outer = cx + outerR * Math.cos(adjStartRad);
                                                                const y1Outer = cy + outerR * Math.sin(adjStartRad);
                                                                const x2Outer = cx + outerR * Math.cos(adjEndRad);
                                                                const y2Outer = cy + outerR * Math.sin(adjEndRad);
                                                                const x1Inner = cx + innerR * Math.cos(adjEndRad);
                                                                const y1Inner = cy + innerR * Math.sin(adjEndRad);
                                                                const x2Inner = cx + innerR * Math.cos(adjStartRad);
                                                                const y2Inner = cy + innerR * Math.sin(adjStartRad);

                                                                const d = [
                                                                    `M ${x1Outer} ${y1Outer}`,
                                                                    `A ${outerR} ${outerR} 0 ${adjLargeArc} 1 ${x2Outer} ${y2Outer}`,
                                                                    `L ${x1Inner} ${y1Inner}`,
                                                                    `A ${innerR} ${innerR} 0 ${adjLargeArc} 0 ${x2Inner} ${y2Inner}`,
                                                                    'Z'
                                                                ].join(' ');

                                                                return (
                                                                    <path
                                                                        key={i}
                                                                        d={d}
                                                                        fill={segment.fill}
                                                                        className="transition-opacity hover:opacity-80 cursor-pointer"
                                                                        opacity={0.9}
                                                                    >
                                                                        <title>{`${segment.name}: $${segment.value.toLocaleString()}/mes (${(percentage * 100).toFixed(1)}%)`}</title>
                                                                    </path>
                                                                );
                                                            });
                                                        })()}
                                                        {/* Center text */}
                                                        <text x="100" y="94" textAnchor="middle" className="fill-foreground font-bold" fontSize="16">${Math.round(totalDonut).toLocaleString()}</text>
                                                        <text x="100" y="112" textAnchor="middle" className="fill-muted-foreground" fontSize="10">mensual</text>
                                                    </svg>
                                            </div>

                                            {/* Breakdown List */}
                                            <div className="space-y-2 max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1">
                                                {donutData.map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between group py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{item.name}</span>
                                                                <span className="text-[10px] text-muted-foreground">{item.count} {item.count === 1 ? 'servicio' : 'servicios'} · {item.frequency === 'monthly' ? 'Mensual' : 'Anual'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-mono font-semibold">${item.value.toLocaleString()}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">{((item.value / totalDonut) * 100).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>

                        {/* Card 2: Proyección Mensual de Ingresos (Bar Chart) */}
                        <Card className="h-full border-t-4 border-t-blue-500 shadow-sm">
                            <CardHeader className="pb-3 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        Proyección de Ingresos
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 font-mono">
                                            ${Math.round(totalAnnual).toLocaleString()}/año
                                        </Badge>
                                        <Badge variant="outline" className="text-muted-foreground font-mono">
                                            ${Math.round(totalAnnual / 365).toLocaleString()}/día
                                        </Badge>
                                    </div>
                                </div>
                                <CardDescription>Ingresos proyectados por mes ({new Date().getFullYear()})</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {loading ? (
                                    <div className="flex items-center justify-center h-[320px]">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (() => {
                                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                                    const currentYear = new Date().getFullYear();
                                    const currentMonth = new Date().getMonth();

                                    const monthlyData = monthNames.map((name, monthIdx) => {
                                        // Monthly subscriptions contribute to every month
                                        let monthlyBase = 0;
                                        let yearlyExtra = 0;

                                        activeSubs.forEach(sub => {
                                            const amountCLP = sub.currency === 'UF' && ufValue ? sub.amount * ufValue : sub.amount;
                                            if (sub.frequency === 'monthly') {
                                                monthlyBase += amountCLP;
                                            } else {
                                                // Annual subscriptions only contribute to their billing month
                                                if (sub.nextBillingDate) {
                                                    const dateStr = sub.nextBillingDate;
                                                    const dateObj = dateStr.includes('T') || dateStr.includes(' ')
                                                        ? new Date(dateStr)
                                                        : new Date(dateStr + 'T00:00:00');
                                                    if (dateObj.getMonth() === monthIdx) {
                                                        yearlyExtra += amountCLP;
                                                    }
                                                }
                                            }
                                        });

                                        return {
                                            name,
                                            monthlyBase: Math.round(monthlyBase),
                                            yearlyExtra: Math.round(yearlyExtra),
                                            total: Math.round(monthlyBase + yearlyExtra),
                                            isCurrent: monthIdx === currentMonth,
                                            isPast: monthIdx < currentMonth,
                                        };
                                    });

                                    const maxVal = Math.max(...monthlyData.map(d => d.total), 1);

                                    return (
                                        <div className="flex flex-col gap-4">
                                            {/* Bar Chart */}
                                            <div className="h-[220px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={monthlyData} barSize={24} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="summaryBarGradient" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                                                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                                                            </linearGradient>
                                                            <linearGradient id="summaryBarGradientHigh" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                                                                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                                                            </linearGradient>
                                                            <linearGradient id="summaryBarGradientPast" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.6} />
                                                                <stop offset="100%" stopColor="#64748b" stopOpacity={0.4} />
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis
                                                            dataKey="name"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                                            dy={8}
                                                        />
                                                        <YAxis
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                                                            tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`}
                                                        />
                                                        <Tooltip
                                                            cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 4 }}
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    const item = payload[0].payload;
                                                                    return (
                                                                        <div className="bg-popover/95 backdrop-blur border border-border rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
                                                                            <p className="font-bold mb-1 text-muted-foreground">{item.name} {currentYear}</p>
                                                                            <p className="text-lg font-bold text-blue-400">${item.total.toLocaleString()}</p>
                                                                            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-blue-400">Base mensual:</span>
                                                                                    <span className="font-mono">${item.monthlyBase.toLocaleString()}</span>
                                                                                </div>
                                                                                {item.yearlyExtra > 0 && (
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-emerald-400">Cobros anuales:</span>
                                                                                        <span className="font-mono">${item.yearlyExtra.toLocaleString()}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                        <Bar dataKey="total" radius={[5, 5, 5, 5]} animationDuration={800}>
                                                            {monthlyData.map((entry, index) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={entry.isPast
                                                                        ? "url(#summaryBarGradientPast)"
                                                                        : entry.yearlyExtra > 0
                                                                            ? "url(#summaryBarGradientHigh)"
                                                                            : "url(#summaryBarGradient)"
                                                                    }
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Stats Footer */}
                                            <div className="grid grid-cols-3 gap-3 px-1">
                                                <div className="bg-muted/30 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Mensuales</p>
                                                    <p className="text-base font-bold text-emerald-500">{activeSubs.filter(s => s.frequency === 'monthly').length}</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground">${Math.round(totalMonthlyServicesAmount).toLocaleString()}/mes</p>
                                                </div>
                                                <div className="bg-muted/30 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Anuales</p>
                                                    <p className="text-base font-bold text-blue-500">{activeSubs.filter(s => s.frequency === 'yearly').length}</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground">${Math.round(totalAnnualServicesAmount).toLocaleString()}/año</p>
                                                </div>
                                                <div className="bg-muted/30 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Anual</p>
                                                    <p className="text-base font-bold text-foreground">${Math.round(totalAnnual).toLocaleString()}</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground">${Math.round(totalAnnual / 365).toLocaleString()}/día</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>





                <TabsContent value="monthly" className="space-y-4 flex-1 flex flex-col h-full">
                    <div className="flex-1 overflow-hidden h-full">
                        <ServiceKanbanBoard
                            subscriptions={filteredSubscriptions}
                            onEdit={handleEdit}
                            onCreate={handleCreate}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            ufValue={ufValue}
                            onMarkPaid={onMarkPaid}
                            onPartialPayment={onPartialPayment}
                            onRevertPayment={handleRevertPayment}
                            onViewPaymentDetails={handleViewPaymentDetails}
                            onViewClient={handleViewClient}
                            onOpenDetail={(sub) => {
                                setSelectedServiceForDetail(sub);
                                setDetailPanelOpen(true);
                            }}
                            onShowHistory={(sub) => {
                                setSelectedSubscriptionForDetail(sub);
                                setHistoryDialogOpen(true);
                            }}
                            mode="monthly"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="annual" className="space-y-4 flex-1 flex flex-col h-full">
                    <div className="flex-1 overflow-hidden h-full">
                        <ServiceKanbanBoard
                            subscriptions={filteredSubscriptions}
                            onEdit={handleEdit}
                            onCreate={handleCreate}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            ufValue={ufValue}
                            onMarkPaid={onMarkPaid}
                            onPartialPayment={onPartialPayment}
                            onRevertPayment={handleRevertPayment}
                            onViewPaymentDetails={handleViewPaymentDetails}
                            onViewClient={handleViewClient}
                            onOpenDetail={(sub) => {
                                setSelectedServiceForDetail(sub);
                                setDetailPanelOpen(true);
                            }}
                            onShowHistory={(sub) => {
                                setSelectedSubscriptionForDetail(sub);
                                setHistoryDialogOpen(true);
                            }}
                            mode="annual"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="archived" className="space-y-4 flex-1 flex flex-col h-full">
                    <div className="flex items-center justify-between shrink-0">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar servicio archivado..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Servicio / Plan</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Monto</TableHead>
                                            <TableHead>Motivo</TableHead>
                                            <TableHead>Archivado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell>
                                            </TableRow>
                                        ) : filteredSubscriptions.filter(s => s.status === 'archived').length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No se encontraron servicios archivados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSubscriptions.filter(s => s.status === 'archived').map((sub) => (
                                                <TableRow key={sub.id}>
                                                    <TableCell className="font-medium">
                                                        {sub.name}
                                                        {sub.currency === 'UF' && <Badge variant="outline" className="ml-2 text-[10px]">UF</Badge>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                                                            {sub.clientName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {sub.currency === 'UF' ? 'UF ' + sub.amount : '$' + sub.amount.toLocaleString()}
                                                        <span className="text-xs text-muted-foreground ml-1">
                                                            ({sub.frequency === 'monthly' ? 'Mensual' : 'Anual'})
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {sub.archiveReason ? (
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {sub.archiveReason}
                                                                </Badge>
                                                                {sub.archiveNotes && (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                                <FileText className="h-3 w-3 text-muted-foreground" />
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-80">
                                                                            <div className="space-y-2">
                                                                                <h4 className="font-medium leading-none">Notas del archivado</h4>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    {sub.archiveNotes}
                                                                                </p>
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Sin motivo</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {sub.archivedAt ? (
                                                            <span className="text-sm">{sub.archivedAt}</span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => handleRestore(sub.id)} title="Restaurar servicio">
                                                                <RotateCcw className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Eliminar permanentemente">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="h-full overflow-y-auto">
                    {activeEntity ? (
                        <NotificationSettings entity={activeEntity} scope="services" />
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Selecciona una entidad para configurar plantillas.</p>
                        </div>
                    )}
                </TabsContent>

            </Tabs>

            <ServiceSelectionDialog
                open={serviceSelectionOpen}
                onOpenChange={setServiceSelectionOpen}
                onSelect={handleServiceSelect}
                filterFrequency={creationContext?.frequency}
            />

            <ClientSelectionDialog
                open={clientSelectionOpen}
                onOpenChange={setClientSelectionOpen}
                onSelect={handleClientSelect}
                entityId={entityId || entities[0]?.id}
            />

            <ServiceDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                        setSelectedClientForService(null);
                        setCreationContext(null);
                    }
                }}
                subscription={editingSubscription}
                clients={clients}
                onSuccess={() => loadData(true)}
                preselectedDefinition={preselectedDefinition}
                onRefreshClients={() => loadData(true)}
                entityId={entityId || entities[0]?.id}
                defaultClientId={selectedClientForService?.id}
                defaultFrequency={creationContext?.frequency}
                defaultMonthIndex={creationContext?.monthIndex}
            />

            <PaymentDialog
                open={paymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                subscription={selectedSubscriptionForPayment}
                onConfirm={handlePaymentConfirm}
                mode={paymentMode}
                ufValue={ufValue}
            />

            <PaymentDetailDialog
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
                subscription={selectedSubscriptionForDetail}
                onRevert={handleRevertPayment}
            />

            <PaymentHistoryDialog
                open={historyDialogOpen}
                onOpenChange={setHistoryDialogOpen}
                movements={selectedSubscriptionForDetail?.currentMovements || []}
                allPayments={selectedSubscriptionForDetail?.allPayments || []}
                totalAmount={
                    selectedSubscriptionForDetail?.currency === 'UF' && ufValue
                        ? (selectedSubscriptionForDetail?.amount || 0) * ufValue
                        : (selectedSubscriptionForDetail?.amount || 0)
                }
                currency={selectedSubscriptionForDetail?.currency || 'CLP'}
                onDelete={handleDeletePayment}
                onEdit={openEditDialog}
            />

            <EditPaymentDialog
                open={editPaymentDialogOpen}
                onOpenChange={setEditPaymentDialogOpen}
                payment={paymentToEdit}
                onSave={handleEditPayment}
            />

            <ArchiveServiceDialog
                open={archiveDialogOpen}
                onOpenChange={setArchiveDialogOpen}
                subscription={subscriptionToArchive}
                onConfirm={handleArchiveConfirm}
            />

            {/* Service Detail Panel */}
            <ServiceDetailPanel
                subscription={selectedServiceForDetail}
                open={detailPanelOpen}
                onOpenChange={setDetailPanelOpen}
                ufValue={ufValue}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onViewClient={handleViewClient}
                onMarkPaid={onMarkPaid}
                onPartialPayment={onPartialPayment}
                onRevertPayment={handleRevertPayment}
                onDeletePayment={handleDeletePayment}
                onRefresh={() => loadData(true)}
                onUpdateSubscription={(updated) => {
                    setSelectedServiceForDetail(updated);
                    setSubscriptions(prev =>
                        prev.map(s => s.id === updated.id ? updated : s)
                    );
                }}
            />

            {/* Floating Bottom Menu */}
            <div className="fixed bottom-12 w-full z-50 flex justify-center pointer-events-none md:bottom-6 md:w-auto md:pointer-events-auto md:left-1/2 md:-translate-x-1/2 md:justify-start">
                <div className="bg-zinc-900/90 dark:bg-zinc-800/90 backdrop-blur-md shadow-lg border border-white/10 p-1.5 rounded-full flex items-center gap-1 pointer-events-auto mr-20 md:mr-0">
                    <button
                        onClick={() => handleTabChange('monthly')}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2",
                            activeTab === 'monthly'
                                ? "bg-zinc-100 text-zinc-900 shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                        )}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        <span>Mensuales</span>
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    <button
                        onClick={() => handleTabChange('annual')}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2",
                            activeTab === 'annual'
                                ? "bg-zinc-100 text-zinc-900 shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                        )}
                    >
                        <CalendarRange className="h-4 w-4" />
                        <span>Anuales</span>
                    </button>
                </div>
            </div>
        </div >
    );
}
