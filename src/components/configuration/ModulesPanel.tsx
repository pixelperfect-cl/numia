import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateEntity } from '@/lib/supabase/database';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { Entity } from '@/types';

interface ModulesPanelProps {
    entity: Entity;
    onUpdate?: () => void;
}

export function ModulesPanel({ entity, onUpdate }: ModulesPanelProps) {
    const [loading, setLoading] = useState(false);
    const [erpEnabled, setErpEnabled] = useState(entity.settings?.erpEnabled || false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateEntity(entity.id, {
                settings: {
                    ...entity.settings,
                    erpEnabled: erpEnabled,
                }
            });
            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            console.error('Error updating modules:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Módulos Avanzados</CardTitle>
                    <CardDescription>Activa funcionalidades extras para esta entidad</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">ERP Agencia</Label>
                            <p className="text-sm text-muted-foreground">
                                Habilita funciones de CRM, Gestión de Proyectos y Cobros Recurrentes.
                            </p>
                        </div>
                        <Switch
                            checked={erpEnabled}
                            onCheckedChange={setErpEnabled}
                            disabled={loading}
                        />
                    </div>

                    {/* Future modules placeholder */}
                    <div className="flex items-center justify-between rounded-lg border p-4 opacity-50">
                        <div className="space-y-0.5">
                            <Label className="text-base">Inventario</Label>
                            <p className="text-sm text-muted-foreground">
                                Gestión de stock y productos (Próximamente)
                            </p>
                        </div>
                        <Switch disabled />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4 opacity-50">
                        <div className="space-y-0.5">
                            <Label className="text-base">Nómina</Label>
                            <p className="text-sm text-muted-foreground">
                                Gestión de empleados y pagos (Próximamente)
                            </p>
                        </div>
                        <Switch disabled />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Guardando...' : 'Guardar Ajustes'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
