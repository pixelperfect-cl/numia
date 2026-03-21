import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs

import { Network, GripVertical, Save, Briefcase } from 'lucide-react';
import { ModulesPanel } from './ModulesPanel';
import { SMTPPanel } from './SMTPPanel';
import { Entity } from '@/types';
import { useData } from '@/contexts/DataContext';

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
    const { updateEntity } = useData();

    // Initialize state properly handling potentially missing new keys in old localStorage data
    const [preferences, setPreferences] = useState<ApiPreference[]>(() => {
        // Use entity preferences if available, otherwise defaults
        const saved = entity?.settings?.apiPreferences;

        // If we have saved preferences in the entity, use those
        if (saved && saved.length > 0) {
            // Map defaults to be easily accessible
            const defaultsMap = new Map(DEFAULT_PREFERENCES.map(d => [d.id, d]));

            // Reconstruct based on saved to keep order
            // Ensure we have all properties from default (like source) in case we add more fields later
            // though for now saved has everything.
            const merged = saved.map((p: ApiPreference) => {
                const def = defaultsMap.get(p.id);
                // If the preference exists in defaults, merge to ensure latest metadata (like name/source changes)
                // but keep 'enabled' status from saved
                return def ? { ...def, enabled: p.enabled } : p;
            }).filter((p: ApiPreference) => defaultsMap.has(p.id));

            // Add any missing defaults at the end (newly added indicators in code)
            DEFAULT_PREFERENCES.forEach(def => {
                if (!merged.find((p: ApiPreference) => p.id === def.id)) {
                    merged.push(def);
                }
            });

            return merged;
        }

        // Fallback: check localStorage for migration during first save? 
        // Or just default. Let's just default to avoid complexity, or checking localStorage 
        // one last time as a "migration" step would be nice.
        const localSaved = localStorage.getItem('api_preferences');
        if (localSaved) {
            try {
                const parsed = JSON.parse(localSaved);
                // Same merge logic
                const defaultsMap = new Map(DEFAULT_PREFERENCES.map(d => [d.id, d]));
                const merged = parsed.map((p: ApiPreference) => {
                    const def = defaultsMap.get(p.id);
                    return def ? { ...def, enabled: p.enabled } : p;
                }).filter((p: ApiPreference) => defaultsMap.has(p.id));
                DEFAULT_PREFERENCES.forEach(def => {
                    if (!merged.find((p: ApiPreference) => p.id === def.id)) {
                        merged.push(def);
                    }
                });
                return merged;
            } catch (e) {
                return DEFAULT_PREFERENCES;
            }
        }

        return DEFAULT_PREFERENCES;
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

    const handleSave = async () => {
        if (!entity) return;
        setIsSaving(true);
        try {
            // Update entity in Firestore
            await updateEntity(entity.id, {
                settings: {
                    ...entity.settings,
                    // valid properties for settings
                    erpEnabled: entity.settings?.erpEnabled ?? false,
                    apiPreferences: preferences
                }
            });

            // Also update localStorage as a backup/cache for this device if needed, 
            // or just remove it to clean up. Let's keep it in sync for now or just ignore it.
            // Actually better to remove it to avoid confusion? 
            // Let's leave it alone or update it so if they switch back to old version (unlikely) it works?
            // Nah, let's just stick to DB.

            // We don't need window dispatch anymore as data flows through Entity
            // but for immediate feedback if using optimistic UI in Header...
            // Header uses activeEntity from DataContext, which refreshes after updateEntity.

            if (onUpdate) onUpdate();

            setHasChanges(false);
        } catch (error) {
            console.error('Error saving preferences:', error);
        } finally {
            setIsSaving(false);
        }
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

            </TabsList>

            <TabsContent value="connections" className="space-y-8">
                {/* SMTP Configuration */}
                {entity && (
                    <SMTPPanel entity={entity} />
                )}

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

            </TabsContent>

            <TabsContent value="modules">
                {entity && onUpdate ? (
                    <ModulesPanel entity={entity} onUpdate={onUpdate} />
                ) : (
                    <div className="text-muted-foreground p-4">Cargando módulos...</div>
                )}
            </TabsContent>


        </Tabs>
    );
}
