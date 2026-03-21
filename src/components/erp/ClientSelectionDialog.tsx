import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getClients } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Search, Loader2, ArrowRight, Mail, Phone, User } from 'lucide-react';
import type { Client } from '@/types';
import { ClientDialog } from './ClientDialog';

interface ClientSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (client: Client) => void;
    entityId?: string;
}

export function ClientSelectionDialog({ open, onOpenChange, onSelect, entityId }: ClientSelectionDialogProps) {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientDialogOpen, setClientDialogOpen] = useState(false);

    useEffect(() => {
        if (open && user) {
            setLoading(true);
            setSearchTerm('');
            getClients(user.uid)
                .then(data => {
                    console.log('🔍 ClientSelectionDialog: entityId prop:', entityId);
                    console.log('🔍 ClientSelectionDialog: Total clients fetched:', data.length);
                    if (data.length > 0) {
                        console.log('🔍 ClientSelectionDialog: Sample client:', data[0]);
                    }

                    // Filter by entity if provided
                    const filtered = entityId
                        ? data.filter(c => c.entityId === entityId)
                        : data;

                    console.log('🔍 ClientSelectionDialog: Filtered clients count:', filtered.length);
                    setClients(filtered);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, user, entityId]);

    const filteredClients = useMemo(() => {
        if (!searchTerm.trim()) return clients;
        const term = searchTerm.toLowerCase();
        return clients.filter(client =>
            client.name.toLowerCase().includes(term) ||
            client.email?.toLowerCase().includes(term) ||
            client.phone?.includes(term) ||
            client.representative?.toLowerCase().includes(term)
        );
    }, [clients, searchTerm]);

    const handleClientCreated = (newClient?: Client) => {
        if (newClient) {
            // Add to local list and select it
            setClients(prev => [newClient, ...prev]);
            onSelect(newClient);
        }
        setClientDialogOpen(false);
    };

    console.log('🔄 ClientSelectionDialog RENDER:', {
        open,
        loading,
        clientsCount: clients.length,
        filteredCount: filteredClients.length
    });

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Seleccionar Cliente</DialogTitle>
                        <DialogDescription>
                            Elige un cliente para asignar el servicio o crea uno nuevo.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, email o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                            autoFocus
                        />
                    </div>

                    <div className="-mx-6 px-6 max-h-[400px] overflow-y-auto no-scrollbar">
                        <div className="space-y-1 py-2">
                            {/* Create New Client Option */}
                            <div
                                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 border-dashed hover:border-primary/50 hover:bg-muted/50 transition-all"
                                onClick={() => setClientDialogOpen(true)}
                            >
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <UserPlus className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-primary">Nuevo Cliente</p>
                                    <p className="text-xs text-muted-foreground">Crear un cliente nuevo</p>
                                </div>
                            </div>

                            {/* Loading State */}
                            {loading && (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            )}

                            {/* No Results */}
                            {!loading && filteredClients.length === 0 && searchTerm && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No se encontraron clientes con "{searchTerm}"</p>
                                    <Button
                                        variant="link"
                                        className="mt-2"
                                        onClick={() => setClientDialogOpen(true)}
                                    >
                                        Crear nuevo cliente
                                    </Button>
                                </div>
                            )}

                            {/* Client List */}
                            {!loading && filteredClients.map((client) => (
                                <div
                                    key={client.id}
                                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/80 transition-all group border border-transparent hover:border-primary/30"
                                    onClick={() => onSelect(client)}
                                >
                                    {/* Avatar */}
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                        <span className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                                            {client.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Client Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium truncate" title={client.name}>
                                                {client.name}
                                            </p>
                                            <Badge
                                                variant={client.status === 'active' ? 'default' : 'secondary'}
                                                className="text-[10px] h-5"
                                            >
                                                {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                            {client.email && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <Mail className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{client.email}</span>
                                                </span>
                                            )}
                                            {client.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3 shrink-0" />
                                                    {client.phone}
                                                </span>
                                            )}
                                            {client.representative && (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3 shrink-0" />
                                                    {client.representative}
                                                </span>
                                            )}
                                            {!client.email && !client.phone && (
                                                <span className="italic opacity-60">Sin datos de contacto</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer with count */}
                    {!loading && (
                        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                            {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
                            {searchTerm && ` encontrado${filteredClients.length !== 1 ? 's' : ''}`}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ClientDialog
                open={clientDialogOpen}
                onOpenChange={setClientDialogOpen}
                onSuccess={handleClientCreated}
                entityId={entityId}
            />
        </>
    );
}

