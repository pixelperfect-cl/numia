import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { updateEntity, getProjectLists } from '@/lib/supabase/database';
import { Save, Plus, Trash2 } from 'lucide-react';
import type { ProjectList } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ProjectSettingsPanelProps {
    entityId: string;
}

export function ProjectSettingsPanel({ entityId }: ProjectSettingsPanelProps) {
    const { user } = useAuth();
    const { entities, refreshData } = useData();
    const entity = entities.find(e => e.id === entityId);
    
    const [projectLists, setProjectLists] = useState<ProjectList[]>([]);
    const [templates, setTemplates] = useState<{
        id: string; // The specific project list status
        subject: string;
        body: string;
        enabled: boolean;
    }[]>([]);
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            getProjectLists(user.uid).then(lists => setProjectLists(lists)).catch(console.error);
        }
    }, [user]);

    useEffect(() => {
        if (entity?.settings?.projectSettings?.statusChangeTemplates) {
            setTemplates(entity.settings.projectSettings.statusChangeTemplates);
        } else {
            setTemplates([]);
        }
    }, [entityId, entities]);

    const handleSave = async () => {
        if (!entity) return;
        setLoading(true);
        try {
            const updatedSettings = {
                ...entity.settings,
                projectSettings: {
                    ...entity.settings?.projectSettings,
                    statusChangeTemplates: templates
                }
            };
            
            await updateEntity(entity.id, { settings: updatedSettings });
            await refreshData();
            alert('Configuración guardada correctamente');
        } catch (error) {
            console.error("Error saving project settings:", error);
            alert('Error al guardar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const addTemplate = () => {
        setTemplates([...templates, {
            id: projectLists[0]?.id || '',
            subject: 'Actualización de Proyecto',
            body: '',
            enabled: true
        }]);
    };

    const updateTemplate = (index: number, field: string, value: any) => {
        const newTemplates = [...templates];
        newTemplates[index] = { ...newTemplates[index], [field]: value };
        setTemplates(newTemplates);
    };

    const deleteTemplate = (index: number) => {
        const newTemplates = [...templates];
        newTemplates.splice(index, 1);
        setTemplates(newTemplates);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Notificaciones de Estado de Proyecto</CardTitle>
                    <CardDescription>
                        Configura los correos automáticos que se enviarán a los clientes cuando un proyecto cambie de estado (columna). 
                        Puedes usar variables como {'{{client_name}}'}, {'{{project_name}}'} y {'{{status_name}}'} en el asunto y cuerpo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {templates.map((template, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/10 relative">
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <Label htmlFor={`enable-proj-${index}`} className="sr-only">Habilitar</Label>
                                <Switch 
                                    id={`enable-proj-${index}`} 
                                    checked={template.enabled} 
                                    onCheckedChange={(c) => updateTemplate(index, 'enabled', c)} 
                                />
                                <Button variant="ghost" size="icon" onClick={() => deleteTemplate(index)} className="text-destructive h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pr-20">
                                <div className="space-y-2">
                                    <Label>Estado Gatillador (Trigger)</Label>
                                    <Select 
                                        value={template.id} 
                                        onValueChange={(val) => updateTemplate(index, 'id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projectLists.map(list => (
                                                <SelectItem key={list.id} value={list.id}>
                                                    Al mover a: {list.title}
                                                </SelectItem>
                                            ))}
                                            {projectLists.length === 0 && (
                                                <SelectItem value="none" disabled>No hay listas configuradas</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>Asunto del correo</Label>
                                    <Input 
                                        placeholder="Ej: Su proyecto avanza a nueva etapa" 
                                        value={template.subject} 
                                        onChange={(e) => updateTemplate(index, 'subject', e.target.value)} 
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Cuerpo del correo</Label>
                                <Textarea 
                                    placeholder="Escribe el mensaje aquí..." 
                                    className="min-h-[100px]"
                                    value={template.body} 
                                    onChange={(e) => updateTemplate(index, 'body', e.target.value)} 
                                />
                            </div>
                        </div>
                    ))}
                    
                    <Button variant="outline" onClick={addTemplate} className="w-full border-dashed">
                        <Plus className="h-4 w-4 mr-2" /> Añadir Notificación Automática
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
