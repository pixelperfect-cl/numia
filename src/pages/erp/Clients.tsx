import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getClients, deleteClient } from '@/lib/firebase/database';
import { useAuth } from '@/contexts/AuthContext';
import { ClientDialog } from '@/components/erp/ClientDialog';
import { Loader2, Plus, Search, Edit, Trash2, Mail, Phone } from 'lucide-react';
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

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);

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

    const handleDelete = async (clientId: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente? Se perderán sus suscripciones asociadas.')) return;
        try {
            await deleteClient(clientId);
            loadClients();
        } catch (error) {
            console.error("Error deleting client:", error);
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
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>Cartera de Clientes</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar cliente..."
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
                </CardContent>
            </Card>

            <ClientDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                client={editingClient}
                onSuccess={loadClients}
                entityId={entityId}
            />
        </div>
    );
}
