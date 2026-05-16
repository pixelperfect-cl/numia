import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Send, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
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
        fromEmail: entity.settings?.smtpConfig?.fromEmail || '',
        billingNotificationsEnabled: entity.settings?.smtpConfig?.billingNotificationsEnabled || false,
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            const nextSmtp: { fromEmail: string; billingNotificationsEnabled: boolean } = {
                fromEmail: formData.fromEmail,
                billingNotificationsEnabled: formData.billingNotificationsEnabled,
            };
            await updateEntity(entity.id, {
                settings: {
                    ...entity.settings,
                    erpEnabled: entity.settings?.erpEnabled || false,
                    smtpEnabled: true,
                    smtpConfig: nextSmtp,
                },
            });
            setTestResult(null);
        } catch (error) {
            console.error('Error saving SMTP config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const { data, error } = await supabase.functions.invoke('test-elasticemail', { body: {} });
            if (error) throw error;
            if (data?.ok) {
                setTestResult({ success: true, message: `Conexión OK${data.email ? ` · cuenta ${data.email}` : ''}` });
            } else {
                setTestResult({ success: false, message: `Error: ${data?.error || 'no se pudo verificar la API key'}` });
            }
        } catch (error: any) {
            setTestResult({ success: false, message: `Error de conexión: ${error.message || 'fallo al llamar la edge function'}` });
        } finally {
            setTesting(false);
        }
    };

    const legacyKeyPresent = !!(entity.settings?.smtpConfig as any)?.apiKey;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <CardTitle>Configuración SMTP (Elastic Email)</CardTitle>
                </div>
                <CardDescription>
                    El envío usa una API key almacenada en el servidor (Supabase Edge Function).
                    Configúrala con <code className="text-xs">supabase secrets set ELASTICEMAIL_API_KEY=…</code>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {legacyKeyPresent && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-700 dark:text-amber-300">
                        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                            Detectamos una API key antigua guardada en esta entidad. Será removida en cuanto guardes esta configuración.
                            Recuerda configurar la nueva key en los <strong>secrets</strong> de Supabase.
                        </span>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="fromEmail">Email de envío (verificado en ElasticEmail)</Label>
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
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                    {testing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Probando...</>) : (<><Send className="mr-2 h-4 w-4" />Probar Conexión</>)}
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
            </CardFooter>
        </Card>
    );
}
