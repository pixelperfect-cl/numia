import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { updateEntity } from '@/lib/supabase/database';
import { Save, Plus, Trash2 } from 'lucide-react';

interface ServiceSettingsPanelProps {
    entityId: string;
}

export function ServiceSettingsPanel({ entityId }: ServiceSettingsPanelProps) {
    const { entities, refreshData } = useData();
    const entity = entities.find(e => e.id === entityId);
    
    const [reminders, setReminders] = useState<{
        id: string;
        daysBefore: number;
        subject: string;
        body: string;
        enabled: boolean;
    }[]>([]);
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (entity?.settings?.serviceSettings?.reminders) {
            setReminders(entity.settings.serviceSettings.reminders);
        } else {
            // Default reminder if none exists
            setReminders([{
                id: crypto.randomUUID(),
                daysBefore: 5,
                subject: 'Aviso de vencimiento próximo',
                body: 'Estimado cliente, le recordamos que su servicio está próximo a vencer en {{days}} días.',
                enabled: true
            }]);
        }
    }, [entityId, entities]);

    const handleSave = async () => {
        if (!entity) return;
        setLoading(true);
        try {
            const updatedSettings = {
                ...entity.settings,
                serviceSettings: {
                    ...entity.settings?.serviceSettings,
                    reminders: reminders
                }
            };
            
            await updateEntity(entity.id, { settings: updatedSettings });
            await refreshData();
            alert('Configuración guardada correctamente');
        } catch (error) {
            console.error("Error saving service settings:", error);
            alert('Error al guardar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const addReminder = () => {
        setReminders([...reminders, {
            id: crypto.randomUUID(),
            daysBefore: 30,
            subject: 'Nuevo aviso',
            body: '',
            enabled: true
        }]);
    };

    const updateReminder = (id: string, field: string, value: any) => {
        setReminders(reminders.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const deleteReminder = (id: string) => {
        setReminders(reminders.filter(r => r.id !== id));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Recordatorios de Cobranza</CardTitle>
                    <CardDescription>
                        Configura los correos automáticos que se enviarán a los clientes antes de la fecha de vencimiento de sus servicios. 
                        Puedes usar variables como {'{{client_name}}'}, {'{{service_name}}'}, {'{{amount}}'}, y {'{{due_date}}'} en el asunto y cuerpo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {reminders.map((reminder, index) => (
                        <div key={reminder.id} className="p-4 border rounded-lg space-y-4 bg-muted/10 relative">
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <Label htmlFor={`enable-${reminder.id}`} className="sr-only">Habilitar</Label>
                                <Switch 
                                    id={`enable-${reminder.id}`} 
                                    checked={reminder.enabled} 
                                    onCheckedChange={(c) => updateReminder(reminder.id, 'enabled', c)} 
                                />
                                <Button variant="ghost" size="icon" onClick={() => deleteReminder(reminder.id)} className="text-destructive h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pr-20">
                                <div className="space-y-2">
                                    <Label>Días antes del vencimiento</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            value={reminder.daysBefore} 
                                            onChange={(e) => updateReminder(reminder.id, 'daysBefore', parseInt(e.target.value) || 0)} 
                                        />
                                        <span className="text-sm text-muted-foreground whitespace-nowrap">días</span>
                                    </div>
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>Asunto del correo</Label>
                                    <Input 
                                        placeholder="Ej: Aviso de pago próximo" 
                                        value={reminder.subject} 
                                        onChange={(e) => updateReminder(reminder.id, 'subject', e.target.value)} 
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Cuerpo del correo</Label>
                                <Textarea 
                                    placeholder="Escribe el mensaje aquí..." 
                                    className="min-h-[100px]"
                                    value={reminder.body} 
                                    onChange={(e) => updateReminder(reminder.id, 'body', e.target.value)} 
                                />
                            </div>
                        </div>
                    ))}
                    
                    <Button variant="outline" onClick={addReminder} className="w-full border-dashed">
                        <Plus className="h-4 w-4 mr-2" /> Añadir Recordatorio
                    </Button>
                </CardContent>
                <CardFooter className="justify-end bg-muted/20 mt-6 pt-6">
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Guardando...' : (
                            <>
                                <Save className="h-4 w-4 mr-2" /> Guardar Configuración
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
