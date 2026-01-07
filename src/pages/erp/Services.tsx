import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getClients, getSubscriptions, deleteSubscription } from '@/lib/firebase/database'; // Need to export deleteSubscription
import { checkAndGenerateSubscriptionMovements } from '@/lib/erp/billing';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceDialog } from '@/components/erp/ServiceDialog';
import { Loader2, Plus, Search, Edit, Trash2, RefreshCw, Briefcase } from 'lucide-react';
import type { Client, Subscription } from '@/types';
import { format } from 'date-fns';

interface ServicesProps {
    entityId?: string;
}

interface EnhancedSubscription extends Subscription {
    clientName: string;
    clientId: string;
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceCatalogPanel } from '@/components/erp/ServiceCatalogPanel';

export function Services({ entityId }: ServicesProps = {}) {
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState<EnhancedSubscription[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [generating, setGenerating] = useState(false);

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<EnhancedSubscription | undefined>(undefined);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Clients
            const clientsData = await getClients(user.uid);

            // Filter clients by entity if provided
            const filteredClients = entityId
                ? clientsData.filter(c => c.entityId === entityId)
                : clientsData;

            setClients(filteredClients);

            // 2. Fetch Subscriptions for each filtered client
            const subsPromises = filteredClients.map(async (client) => {
                const clientSubs = await getSubscriptions(client.id, user.uid);
                return clientSubs.map(sub => ({
                    ...sub,
                    clientName: client.name,
                    clientId: client.id
                }));
            });

            const results = await Promise.all(subsPromises);
            const flatSubs = results.flat();
            setSubscriptions(flatSubs);

        } catch (error) {
            console.error("Error loading services:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user, entityId]);

    const handleCreate = () => {
        setEditingSubscription(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (sub: EnhancedSubscription) => {
        setEditingSubscription(sub);
        setDialogOpen(true);
    };

    const handleDelete = async (subscriptionId: string) => {
        if (!confirm('¿Estás seguro de cancelar este servicio?')) return;
        try {
            await deleteSubscription(subscriptionId);
            loadData();
        } catch (error) {
            console.error("Error deleting subscription:", error);
        }
    };

    const handleGenerateBilling = async () => {
        if (!user) return;
        setGenerating(true);
        try {
            const result = await checkAndGenerateSubscriptionMovements(user.uid);
            if (result.created > 0) {
                alert(`Se han generado ${result.created} movimientos pendientes.`);
            } else {
                alert("No hay suscripciones pendientes de cobro para hoy.");
            }
        } catch (error) {
            console.error(error);
            alert("Error al generar cobros.");
        } finally {
            setGenerating(false);
        }
    };

    const filteredSubscriptions = subscriptions.filter(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Servicios</h1>
                    <p className="text-muted-foreground">Administra las suscripciones y servicios recurrentes de tus clientes</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleGenerateBilling} disabled={generating}>
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Generar Cobros
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Asignar Servicio
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">Servicios Activos</TabsTrigger>
                    <TabsTrigger value="catalog">Catálogo de Servicios</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle>Servicios Activos</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar servicio o cliente..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Servicio / Plan</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Monto</TableHead>
                                            <TableHead>Frecuencia</TableHead>
                                            <TableHead>Próx. Cobro</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8">Cargando...</TableCell>
                                            </TableRow>
                                        ) : filteredSubscriptions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No se encontraron servicios activos.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSubscriptions.map((sub) => (
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
                                                    </TableCell>
                                                    <TableCell className="capitalize">{sub.frequency === 'monthly' ? 'Mensual' : 'Anual'}</TableCell>
                                                    <TableCell>{format(new Date(sub.nextBillingDate), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                                                            {sub.status === 'active' ? 'Activo' : 'Inactivo'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)} className="text-red-500 hover:text-red-700">
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

                <TabsContent value="catalog">
                    <ServiceCatalogPanel />
                </TabsContent>
            </Tabs>

            <ServiceDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                subscription={editingSubscription}
                clients={clients}
                onSuccess={loadData}
            />
        </div>
    );
}
