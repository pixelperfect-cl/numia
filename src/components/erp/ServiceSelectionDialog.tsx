import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getServiceDefinitions } from '@/lib/firebase/database';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Plus, Loader2, ArrowRight } from 'lucide-react';
import type { ServiceDefinition } from '@/types';

interface ServiceSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (definition: ServiceDefinition | null) => void;
}

export function ServiceSelectionDialog({ open, onOpenChange, onSelect }: ServiceSelectionDialogProps) {
    const { user } = useAuth();
    const [definitions, setDefinitions] = useState<ServiceDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open && user) {
            setLoading(true);
            getServiceDefinitions(user.uid)
                .then(setDefinitions)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, user]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Seleccionar Servicio</DialogTitle>
                    <DialogDescription>
                        Elige un servicio de la lista o crea uno personalizado.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                    {/* Custom Service Option */}
                    <Card
                        className="cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all border-dashed"
                        onClick={() => onSelect(null)}
                    >
                        <CardContent className="flex flex-col items-center justify-center h-full min-h-[180px] p-6 text-center space-y-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Nuevo Personalizado</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Crear un servicio desde cero sin plantilla
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Loading State */}
                    {loading && (
                        <div className="col-span-full flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {/* Service Definitions */}
                    {!loading && definitions.map((def) => (
                        <Card
                            key={def.id}
                            className="cursor-pointer hover:border-primary hover:shadow-sm transition-all group relative overflow-hidden"
                            onClick={() => onSelect(def)}
                        >
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                                            <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <Badge variant="secondary" className="capitalize">
                                            {def.frequency === 'monthly' ? 'Mensual' : 'Anual'}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-lg line-clamp-1" title={def.name}>
                                            {def.name}
                                        </h3>
                                        <p className="text-xl font-bold mt-1 text-primary">
                                            {def.currency === 'UF' ? 'UF' : '$'} {def.currency === 'UF' ? def.amount : def.amount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                                    <span className="group-hover:text-foreground transition-colors">
                                        Seleccionar
                                    </span>
                                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
