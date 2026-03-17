import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ServiceDefinitionDialog } from '@/components/erp/ServiceDefinitionDialog';
import { getServiceDefinitions, deleteServiceDefinition, getAllSubscriptions } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit, Trash2, Package, RefreshCw, Users } from 'lucide-react';
import type { ServiceDefinition, Subscription } from '@/types';

export function ServiceCatalogPanel() {
    const { user } = useAuth();
    const [definitions, setDefinitions] = useState<ServiceDefinition[]>([]);
    const [subscriptionCounts, setSubscriptionCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingDefinition, setEditingDefinition] = useState<ServiceDefinition | undefined>(undefined);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [defsData, subsData] = await Promise.all([
                getServiceDefinitions(user.uid),
                getAllSubscriptions(user.uid)
            ]);

            setDefinitions(defsData);

            // Calculate active subscriptions per service name
            const counts: Record<string, number> = {};
            subsData.forEach(sub => {
                if (sub.status === 'active') {
                    // Try to match by exact name first
                    // We normalize/trim just in case
                    const serviceName = sub.name.trim();
                    counts[serviceName] = (counts[serviceName] || 0) + 1;
                }
            });
            setSubscriptionCounts(counts);

        } catch (error) {
            console.error("Error loading service definitions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleCreate = () => {
        setEditingDefinition(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (def: ServiceDefinition) => {
        setEditingDefinition(def);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Â¿EstÃ¡s seguro de eliminar este servicio del catÃ¡logo? No afectarÃ¡ a las suscripciones ya asignadas.')) return;
        try {
            await deleteServiceDefinition(id);
            loadData();
        } catch (error) {
            console.error("Error deleting service definition:", error);
        }
    };

    const filteredDefinitions = definitions.filter(def =>
        def.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg border">
                <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Package className="h-5 w-5" /> CatÃ¡logo de Servicios
                    </h3>
                    <p className="text-sm text-muted-foreground">Define tus servicios estÃ¡ndar para asignarlos rÃ¡pidamente.</p>
                </div>
                <Button onClick={handleCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base">Servicios Definidos</CardTitle>
                            <Button variant="ghost" size="icon" onClick={loadData} title="Actualizar lista">
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar en catÃ¡logo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Servicio</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Valor Base</TableHead>
                                    <TableHead>Frecuencia</TableHead>
                                    <TableHead className="text-center">Clientes</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">Cargando catÃ¡logo...</TableCell>
                                    </TableRow>
                                ) : filteredDefinitions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No hay servicios definidos aÃºn.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDefinitions.map((def) => (
                                        <TableRow key={def.id}>
                                            <TableCell className="font-medium">{def.name}</TableCell>
                                            <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                                {def.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-semibold">
                                                    {def.currency === 'UF' ? 'UF ' : '$'}
                                                    {def.currency === 'UF' ? def.amount : def.amount.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                <Badge variant="outline">
                                                    {def.frequency === 'monthly' ? 'Mensual' : 'Anual'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5" title={`${subscriptionCounts[def.name] || 0} clientes activos`}>
                                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="font-mono font-medium">
                                                        {subscriptionCounts[def.name] || 0}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(def)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(def.id)} className="text-red-500 hover:text-red-700">
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

            <ServiceDefinitionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                definition={editingDefinition}
                onSuccess={loadData}
            />
        </div>
    );
}

