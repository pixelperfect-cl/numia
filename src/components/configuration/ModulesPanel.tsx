import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateEntity } from '@/lib/firebase/database';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { Entity } from '@/types';

interface ModulesPanelProps {
    entity: Entity;
}

export function ModulesPanel({ entity }: ModulesPanelProps) {
    const [loading, setLoading] = useState(false);
    const [erpEnabled, setErpEnabled] = useState(entity.settings?.erpEnabled || false);
    const [smtpEnabled, setSmtpEnabled] = useState(entity.settings?.smtpEnabled || false);

    const handleErpToggle = async (checked: boolean) => {
        setLoading(true);
        try {
            await updateEntity(entity.id, {
                settings: { ...entity.settings, erpEnabled: checked }
            });
            setErpEnabled(checked);
        } catch (error) {
            console.error('Error updating module:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSmtpToggle = async (checked: boolean) => {
        setLoading(true);
        try {
            await updateEntity(entity.id, {
                settings: { ...entity.settings, smtpEnabled: checked }
            });
            setSmtpEnabled(checked);
        } catch (error) {
            console.error('Error updating SMTP:', error);
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
                            onCheckedChange={handleErpToggle}
                            disabled={loading}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">SMTP / Notificaciones por Email</Label>
                            <p className="text-sm text-muted-foreground">
                                Permite enviar notificaciones y códigos de confirmación por correo electrónico.
                            </p>
                        </div>
                        <Switch
                            checked={smtpEnabled}
                            onCheckedChange={handleSmtpToggle}
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
                </CardContent>
            </Card>
        </div>
    );
}
