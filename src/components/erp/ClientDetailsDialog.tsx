import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscriptions, deleteSubscription } from '@/lib/firebase/database';
import { ServiceDialog } from './ServiceDialog';
import { ServiceSelectionDialog } from './ServiceSelectionDialog';
import { Briefcase, Mail, Phone, Calendar, Plus, Edit, Trash2, CreditCard, User, Building2, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { Client, Subscription, ServiceDefinition } from '@/types';

interface ClientDetailsDialogProps {
    client: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEditClient: (client: Client) => void;
}

export function ClientDetailsDialog({ client, open, onOpenChange, onEditClient }: ClientDetailsDialogProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);

    // Service Dialog State
    // Service Dialog State
    const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
    const [serviceSelectionOpen, setServiceSelectionOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>(undefined);
    const [preselectedDefinition, setPreselectedDefinition] = useState<ServiceDefinition | null>(null);

    const loadServices = async () => {
        if (!user || !client) return;
        setLoadingServices(true);
        try {
            const subs = await getSubscriptions(client.id, user.uid);
            setSubscriptions(subs);
        } catch (error) {
            console.error("Error loading client services:", error);
        } finally {
            setLoadingServices(false);
        }
    };

    useEffect(() => {
        if (open && client) {
            loadServices();
            setActiveTab('overview');
        }
    }, [open, client, user]);

    const handleAddService = () => {
        setEditingSubscription(undefined);
        setServiceSelectionOpen(true);
    };

    const handleServiceSelect = (definition: ServiceDefinition | null) => {
        setServiceSelectionOpen(false);
        setPreselectedDefinition(definition);
        setServiceDialogOpen(true);
    };

    const handleEditService = (sub: Subscription) => {
        const subWithClientId = { ...sub, clientId: client?.id }; // Ensure clientId is present
        setEditingSubscription(subWithClientId);
        setPreselectedDefinition(null);
        setServiceDialogOpen(true);
    };

    const handleDeleteService = async (subscriptionId: string) => {
        if (!confirm('¿Estás seguro de cancelar este servicio?')) return;
        try {
            await deleteSubscription(subscriptionId);
            loadServices();
        } catch (error) {
            console.error("Error deleting subscription:", error);
        }
    };

    if (!client) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="text-xl">{client.name}</span>
                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                {client.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="overview">Información General</TabsTrigger>
                            <TabsTrigger value="services">Servicios ({subscriptions.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4 mt-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Contacto Principal</p>
                                                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                                        {client.email && (
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="h-3.5 w-3.5" />
                                                                <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                                                            </div>
                                                        )}
                                                        {client.phone && (
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="h-3.5 w-3.5" />
                                                                <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <Building2 className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Datos de Facturación</p>
                                                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-3.5 w-3.5" />
                                                            <span>RUT: {client.rut || 'No registrado'}</span>
                                                        </div>
                                                        {client.address && (
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                <span>{client.address}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {(client.emails?.length > 0 || client.phones?.length > 0) && (
                                    <Card className="md:col-span-2">
                                        <CardContent className="pt-6">
                                            <p className="font-medium mb-3">Contactos Adicionales</p>
                                            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                                                {client.emails?.map((email, idx) => (
                                                    <div key={`email-${idx}`} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                                        <Mail className="h-3.5 w-3.5" /> {email}
                                                    </div>
                                                ))}
                                                {client.phones?.map((phone, idx) => (
                                                    <div key={`phone-${idx}`} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                                        <Phone className="h-3.5 w-3.5" /> {phone}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button variant="outline" onClick={() => {
                                    onOpenChange(false);
                                    onEditClient(client);
                                }}>
                                    <Edit className="mr-2 h-4 w-4" /> Editorial Información
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="services" className="space-y-4 mt-4">
                            <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg border">
                                <div>
                                    <h3 className="font-medium flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" /> Servicios Activos
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Gestiona los planes y servicios suscritos.</p>
                                </div>
                                <Button size="sm" onClick={handleAddService}>
                                    <Plus className="mr-2 h-4 w-4" /> Asignar Servicio
                                </Button>
                            </div>

                            {loadingServices ? (
                                <div className="text-center py-8 text-muted-foreground">Cargando servicios...</div>
                            ) : subscriptions.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                    <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                                    <h3 className="text-lg font-medium">Sin servicios activos</h3>
                                    <p className="text-muted-foreground text-sm mb-4">Este cliente no tiene servicios asignados actualmente.</p>
                                    <Button variant="outline" onClick={handleAddService}>Asignar Primer Servicio</Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {subscriptions.map(sub => (
                                        <div key={sub.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Briefcase className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium">{sub.name}</h4>
                                                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                                            {sub.status === 'active' ? 'Activo' : 'Inactivo'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                        <span className="font-medium text-foreground">
                                                            {sub.currency === 'UF' ? 'UF ' + sub.amount : '$' + sub.amount.toLocaleString()}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="capitalize">{sub.frequency === 'monthly' ? 'Mensual' : 'Anual'}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            Prox: {format(new Date(sub.nextBillingDate + 'T00:00:00'), 'dd/MM/yyyy')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditService(sub)}>
                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteService(sub.id)} className="text-destructive/70 hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Service Dialog for adding/editing within client context */}
            {client && (
                <>
                    <ServiceSelectionDialog
                        open={serviceSelectionOpen}
                        onOpenChange={setServiceSelectionOpen}
                        onSelect={handleServiceSelect}
                    />

                    <ServiceDialog
                        open={serviceDialogOpen}
                        onOpenChange={(open) => {
                            setServiceDialogOpen(open);
                            // Reload services when dialog closes if needed? ServiceDialog onSuccess handles this better.
                        }}
                        subscription={editingSubscription}
                        clients={[client]} // Only pass this client to restrict selection (though it's disabled anyway)
                        defaultClientId={client.id}
                        preselectedDefinition={preselectedDefinition}
                        onSuccess={() => {
                            loadServices();
                            // setServiceDialogOpen(false); // Handled by onOpenChange inside ServiceDialog usually, but adding for safety
                        }}
                    />
                </>
            )}
        </>
    );
}
