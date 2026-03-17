import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getClients, deleteClient } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/AuthContext';
import { ClientDialog } from '@/components/erp/ClientDialog';
import { ClientDetailsDialog } from '@/components/erp/ClientDetailsDialog';
import { Loader2, Plus, Search, Edit, Trash2, Mail, Phone, Eye, LayoutGrid, List } from 'lucide-react';
import type { Client } from '@/types';
import { format } from 'date-fns';

interface ClientsProps {
    entityId?: string;
}

export function Clients({ entityId }: ClientsProps = {}) {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [viewingClient, setViewingClient] = useState<Client | null>(null);

    const loadClients = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getClients(user.uid);
            setClients(data);
        } catch (error) {
            console.error("Error loading clients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClients();
    }, [user]);

    const handleCreate = () => {
        setEditingClient(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setDialogOpen(true);
    };

    const handleViewDetails = (client: Client) => {
        setViewingClient(client);
        setDetailsOpen(true);
    };

    const handleDelete = async (clientId: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente? Se perderán sus suscripciones asociadas.')) return;
        try {
            if (!user?.uid) return;
            await deleteClient(clientId, user.uid);
            loadClients();
        } catch (error: any) {
            console.error("Error deleting client:", error);
            alert(error.message || "Error al eliminar el cliente");
        }
    };

    // Filter by entity if provided
    const scopedClients = entityId
        ? clients.filter(c => c.entityId === entityId)
        : clients;

    const filteredClients = scopedClients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h1>
                    <p className="text-muted-foreground">Administra tu base de datos de clientes</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleCreate} size="icon" className="md:w-auto md:px-4 md:py-2">
                        <Plus className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Nuevo Cliente</span>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <CardTitle>Cartera de Clientes</CardTitle>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar cliente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <div className="flex border rounded-md">
                                <Button
                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('list')}
                                    className="h-9 w-9 rounded-none rounded-l-md"
                                    title="Vista de lista"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('grid')}
                                    className="h-9 w-9 rounded-none rounded-r-md"
                                    title="Vista de tarjetas"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {viewMode === 'list' ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre / Empresa</TableHead>
                                        <TableHead>Contacto</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Fecha Registro</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell>
                                        </TableRow>
                                    ) : filteredClients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No se encontraron clientes.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredClients.map((client) => (
                                            <TableRow key={client.id}>
                                                <TableCell className="font-medium">{client.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                                        {client.email && (
                                                            <div className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" /> {client.email}
                                                            </div>
                                                        )}
                                                        {client.emails && client.emails.length > 0 && client.emails.map((email, idx) => (
                                                            <div key={idx} className="flex items-center gap-1 text-xs">
                                                                <Mail className="h-3 w-3 opacity-50" /> {email}
                                                            </div>
                                                        ))}
                                                        {client.phone && (
                                                            <div className="flex items-center gap-1">
                                                                <Phone className="h-3 w-3" /> {client.phone}
                                                            </div>
                                                        )}
                                                        {client.phones && client.phones.length > 0 && client.phones.map((phone, idx) => (
                                                            <div key={idx} className="flex items-center gap-1 text-xs">
                                                                <Phone className="h-3 w-3 opacity-50" /> {phone}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{format(client.createdAt, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(client)} title="Ver detalles y servicios">
                                                            <Eye className="h-4 w-4 text-primary" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-700">
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
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {loading ? (
                                <div className="col-span-full text-center py-8">Cargando...</div>
                            ) : filteredClients.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-muted-foreground">
                                    No se encontraron clientes.
                                </div>
                            ) : (
                                filteredClients.map((client) => (
                                    <Card key={client.id} className="overflow-hidden">
                                        <div className="p-4 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{client.name}</h3>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Registrado: {format(client.createdAt, 'dd/MM/yyyy')}
                                                    </div>
                                                </div>
                                                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                                    {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </div>

                                            <div className="space-y-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                                                {client.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-3 w-3 shrink-0" />
                                                        <span className="truncate" title={client.email}>{client.email}</span>
                                                    </div>
                                                )}
                                                {client.emails && client.emails.length > 0 && client.emails.map((email, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        <Mail className="h-3 w-3 shrink-0 opacity-50" />
                                                        <span className="truncate" title={email}>{email}</span>
                                                    </div>
                                                ))}
                                                {client.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3 shrink-0" />
                                                        <span>{client.phone}</span>
                                                    </div>
                                                )}
                                                {client.phones && client.phones.length > 0 && client.phones.map((phone, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        <Phone className="h-3 w-3 shrink-0 opacity-50" />
                                                        <span>{phone}</span>
                                                    </div>
                                                ))}
                                                {!client.email && (!client.emails || client.emails.length === 0) &&
                                                    !client.phone && (!client.phones || client.phones.length === 0) && (
                                                        <span className="italic text-xs opacity-70">Sin información de contacto</span>
                                                    )}
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2 border-t">
                                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(client)} title="Ver detalles y servicios">
                                                    <Eye className="h-4 w-4 mr-1 text-primary" /> Detalles
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                                                    <Edit className="h-4 w-4 mr-1" /> Editar
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ClientDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                client={editingClient}
                onSuccess={loadClients}
                entityId={entityId}
            />

            <ClientDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                client={viewingClient}
                onEditClient={handleEdit}
            />
        </div>
    );
}
