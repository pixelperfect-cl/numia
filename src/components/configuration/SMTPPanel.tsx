import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useData } from '@/contexts/DataContext';
import { Loader2 } from 'lucide-react';
import type { Entity } from '@/types';

interface SMTPPanelProps {
    entity: Entity;
}

export function SMTPPanel({ entity }: SMTPPanelProps) {
    const { updateEntity } = useData();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        apiKey: entity.settings?.smtpConfig?.apiKey || '',
        fromEmail: entity.settings?.smtpConfig?.fromEmail || '',
        billingNotificationsEnabled: entity.settings?.smtpConfig?.billingNotificationsEnabled || false,
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateEntity(entity.id, {
                settings: {
                    ...entity.settings,
                    erpEnabled: entity.settings?.erpEnabled || false, // Preserve existing
                    smtpEnabled: true, // Auto-enable if saving config
                    smtpConfig: {
                        apiKey: formData.apiKey,
                        fromEmail: formData.fromEmail,
                        billingNotificationsEnabled: formData.billingNotificationsEnabled,
                    },
                },
            });
        } catch (error) {
            console.error('Error saving SMTP config:', error);
            // Optionally add error handling UI
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración SMTP (Elastic Email)</CardTitle>
                <CardDescription>Configura el envío de correos y notificaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                        id="apiKey"
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="Elastic Email API Key"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="fromEmail">Email de Envío</Label>
                    <Input
                        id="fromEmail"
                        type="email"
                        value={formData.fromEmail}
                        onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                        placeholder="noreply@tu-dominio.com"
                    />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <Switch
                        id="billing-notifications"
                        checked={formData.billingNotificationsEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, billingNotificationsEnabled: checked })}
                    />
                    <Label htmlFor="billing-notifications">Habilitar Notificaciones de Cobro</Label>
                </div>
                <p className="text-sm text-muted-foreground pl-12 -mt-2">
                    Envía notificaciones automáticas a los clientes cuando se generan cobros.
                </p>

                <div className="pt-4">
                    <Button onClick={handleSave} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
