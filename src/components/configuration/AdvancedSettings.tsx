import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs

import { Network, GripVertical, Save, Briefcase, Mail } from 'lucide-react';
import { MigrationPanel } from './MigrationPanel';
import { ModulesPanel } from './ModulesPanel'; // Import ModulesPanel
import { SMTPPanel } from './SMTPPanel'; // Import SMTPPanel
import { Entity } from '@/types'; // Import Entity type

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ApiPreference {
    id: string;
    name: string;
    enabled: boolean;
    source: string;
}

const DEFAULT_PREFERENCES: ApiPreference[] = [
    { id: 'uf', name: 'Unidad de Fomento (UF)', enabled: true, source: 'mindicador.cl' },
    { id: 'dolar', name: 'Dólar Observado', enabled: true, source: 'mindicador.cl' },
    { id: 'euro', name: 'Euro', enabled: true, source: 'mindicador.cl' },
    { id: 'utm', name: 'UTM', enabled: true, source: 'mindicador.cl' },
    { id: 'bitcoin', name: 'Bitcoin', enabled: false, source: 'mindicador.cl' },
    { id: 'ipc', name: 'IPC', enabled: false, source: 'mindicador.cl' },
    { id: 'ivp', name: 'IVP', enabled: false, source: 'mindicador.cl' },
    { id: 'imacec', name: 'IMACEC', enabled: false, source: 'mindicador.cl' },
    { id: 'tpm', name: 'Tasa Política Monetaria (TPM)', enabled: false, source: 'mindicador.cl' },
    { id: 'libra_cobre', name: 'Libra de Cobre', enabled: false, source: 'mindicador.cl' },
    { id: 'tasa_desempleo', name: 'Tasa de Desempleo', enabled: false, source: 'mindicador.cl' },
];

function SortableItem(props: { id: string, pref: ApiPreference, onToggle: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between space-x-2 bg-card p-2 rounded-md border border-transparent hover:border-border/50 transition-colors">
            <div className="flex items-center gap-3">
                <button {...attributes} {...listeners} className="cursor-grab hover:text-primary active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="flex flex-col space-y-1">
                    <Label htmlFor={props.pref.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {props.pref.name}
                    </Label>
                    <span className="text-xs text-muted-foreground">Fuente: {props.pref.source}</span>
                </div>
            </div>
            <Switch
                id={props.pref.id}
                checked={props.pref.enabled}
                onCheckedChange={() => props.onToggle(props.pref.id)}
            />
        </div>
    );
}

interface AdvancedSettingsProps {
    entity?: Entity; // Optional because EntityConfiguration handles entity loading, but it might not be ready initially, though parent guards it.
    onUpdate?: () => void;
}

export function AdvancedSettings({ entity, onUpdate }: AdvancedSettingsProps) {
    // Initialize state properly handling potentially missing new keys in old localStorage data
    const [preferences, setPreferences] = useState<ApiPreference[]>(() => {
        const saved = localStorage.getItem('api_preferences');
        if (!saved) return DEFAULT_PREFERENCES;

        try {
            const parsed = JSON.parse(saved);
            // Merge saved prefs with defaults to ensure all keys exist
            // Also we must preserve the ORDER of parsed prefs if possible, 
            // but add new defaults at the end.

            // Map defaults to be easily accessible
            const defaultsMap = new Map(DEFAULT_PREFERENCES.map(d => [d.id, d]));

            // Reconstruct based on parsed to keep order
            const merged = parsed.map((p: ApiPreference) => {
                const def = defaultsMap.get(p.id);
                return def ? { ...def, enabled: p.enabled } : p;
            }).filter((p: ApiPreference) => defaultsMap.has(p.id));

            // Add any missing defaults at the end
            DEFAULT_PREFERENCES.forEach(def => {
                if (!merged.find((p: ApiPreference) => p.id === def.id)) {
                    merged.push(def);
                }
            });

            return merged;
        } catch (e) {
            console.error('Error parsing api preferences', e);
            return DEFAULT_PREFERENCES;
        }
    });

    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setPreferences((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
            setHasChanges(true);
        }
    };

    const togglePreference = (id: string) => {
        setPreferences(prev => prev.map(p =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
        ));
        setHasChanges(true);
    };

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('api_preferences', JSON.stringify(preferences));
        window.dispatchEvent(new Event('api-preferences-changed'));
        setTimeout(() => {
            setIsSaving(false);
            setHasChanges(false);
        }, 500);
    };

    return (
        <Tabs defaultValue="connections" className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap no-scrollbar h-auto p-1 bg-muted/50 rounded-lg">
                <TabsTrigger value="connections" className="flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    Conexiones y Migración
                </TabsTrigger>
                <TabsTrigger value="modules" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Módulos
                </TabsTrigger>
                <TabsTrigger value="smtp" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    SMTP
                </TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="space-y-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Network className="h-5 w-5 text-primary" />
                            <CardTitle>Configuración Avanzada</CardTitle>
                        </div>
                        <CardDescription>
                            Gestiona las conexiones a APIs externas, herramientas de sistema y migración de datos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium mb-3">Indicadores Económicos (mindicador.cl)</h3>

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={preferences.map(p => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2">
                                        {preferences.map((pref) => (
                                            <SortableItem
                                                key={pref.id}
                                                id={pref.id}
                                                pref={pref}
                                                onToggle={togglePreference}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t pt-6">
                        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                            {isSaving ? (
                                <>Guardando...</>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                <MigrationPanel />
            </TabsContent>

            <TabsContent value="modules">
                {entity && onUpdate ? (
                    <ModulesPanel entity={entity} onUpdate={onUpdate} />
                ) : (
                    <div className="text-muted-foreground p-4">Cargando módulos...</div>
                )}
            </TabsContent>

            <TabsContent value="smtp">
                {entity ? (
                    <SMTPPanel entity={entity} />
                ) : (
                    <div className="text-muted-foreground p-4">Cargando SMTP...</div>
                )}
            </TabsContent>
        </Tabs>
    );
}
