import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useData } from '@/contexts/DataContext';
import { Loader2, Mail, Send, CheckCircle2, XCircle } from 'lucide-react';
import type { Entity } from '@/types';

interface SMTPPanelProps {
    entity: Entity;
}

export function SMTPPanel({ entity }: SMTPPanelProps) {
    const { updateEntity } = useData();
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
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
                    erpEnabled: entity.settings?.erpEnabled || false,
                    smtpEnabled: true,
                    smtpConfig: {
                        apiKey: formData.apiKey,
                        fromEmail: formData.fromEmail,
                        billingNotificationsEnabled: formData.billingNotificationsEnabled,
                    },
                },
            });
            setTestResult(null); // Reset test result after save
        } catch (error) {
            console.error('Error saving SMTP config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        if (!formData.apiKey || !formData.fromEmail) {
            setTestResult({ success: false, message: 'Completa la API Key y el Email de envío primero.' });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            // Use the Elastic Email API to verify the API key
            const response = await fetch('https://api.elasticemail.com/v2/account/load', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Use query param approach since Elastic Email v2 uses query params
            const verifyResponse = await fetch(
                `https://api.elasticemail.com/v2/account/load?apikey=${encodeURIComponent(formData.apiKey)}`
            );

            const data = await verifyResponse.json();

            if (data.success) {
                setTestResult({
                    success: true,
                    message: `✓ Conexión exitosa. Cuenta: ${data.data?.email || formData.fromEmail}`,
                });
            } else {
                setTestResult({
                    success: false,
                    message: `Error: ${data.error || 'API Key inválida o sin permisos.'}`,
                });
            }
        } catch (error: any) {
            setTestResult({
                success: false,
                message: `Error de conexión: ${error.message || 'No se pudo conectar con Elastic Email.'}`,
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <CardTitle>Configuración SMTP (Elastic Email)</CardTitle>
                </div>
                <CardDescription>Configura el envío de correos y notificaciones automáticas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <Switch
                        id="billing-notifications"
                        checked={formData.billingNotificationsEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, billingNotificationsEnabled: checked })}
                    />
                    <div className="space-y-0.5">
                        <Label htmlFor="billing-notifications">Habilitar Notificaciones de Cobro</Label>
                        <p className="text-sm text-muted-foreground">
                            Envía notificaciones automáticas a los clientes cuando se generan cobros.
                        </p>
                    </div>
                </div>

                {/* Test Result */}
                {testResult && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
                        testResult.success
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-destructive/5 border-destructive/20 text-destructive'
                    }`}>
                        {testResult.success
                            ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                            : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        }
                        <span>{testResult.message}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
                <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testing || !formData.apiKey}
                >
                    {testing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Probando...
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            Probar Conexión
                        </>
                    )}
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
            </CardFooter>
        </Card>
    );
}
