import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Plus, Loader2, ArrowRight } from 'lucide-react';
import { getClients } from '@/lib/firebase/database';
import { useAuth } from '@/contexts/AuthContext';
import type { Client } from '@/types';

interface ClientSelectionStepProps {
    onSelect: (client: Client) => void;
    onCancel: () => void;
}

export function ClientSelectionStep({ onSelect, onCancel }: ClientSelectionStepProps) {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            loadClients();
        }
    }, [user]);

    const loadClients = async () => {
        if (!user) return;
        try {
            const data = await getClients(user.uid);
            setClients(data);
        } catch (error) {
            console.error("Error loading clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 relative">
                <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
                {/* New Client Option - Placeholder for now could be wired up later */}
                <Card
                    className="cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all border-dashed"
                    onClick={() => {/* TODO: Implement quick client creation or redirect */ console.log("New client clicked") }}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Nuevo Cliente</h3>
                            <p className="text-xs text-muted-foreground">Crear un cliente nuevo</p>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No se encontraron clientes
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <Card
                            key={client.id}
                            className="cursor-pointer hover:border-primary hover:shadow-sm transition-all group"
                            onClick={() => onSelect(client)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{client.name}</h3>
                                        {client.email && (
                                            <p className="text-xs text-muted-foreground">{client.email}</p>
                                        )}
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-muted-foreground" />
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="flex justify-end pt-2">
                <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
            </div>
        </div>
    );
}
