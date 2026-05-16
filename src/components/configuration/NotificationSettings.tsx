/**
 * Numia v1.0 - Notification Settings Component
 *
 * Edita los triggers de email de una entidad. Puede renderizarse:
 *   - sin scope → tabs Servicios | Proyectos (uso histórico en /configuration)
 *   - scope='services' → solo triggers relacionados a servicios (service_due + billing_generated)
 *   - scope='projects' → solo triggers relacionados a proyectos (project_status + billing_generated)
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger as SelectTrig,
    SelectValue,
} from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectLists, getClients } from '@/lib/supabase/database';
import {
    Save,
    Plus,
    Trash2,
    Bell,
    Clock,
    ArrowRightLeft,
    Receipt,
    ChevronDown,
    ChevronUp,
    Info,
    Loader2,
    ListIcon,
    SquareKanban,
    Sparkles,
} from 'lucide-react';
import { NotificationCreationWizard } from './NotificationCreationWizard';
import type { TriggerType as WizardTriggerType, WizardData } from './NotificationCreationWizard';
import type { Entity, ProjectList, Client } from '@/types';
import {
    defaultServiceDueTemplates,
    defaultBillingTemplates,
    defaultProjectBillingTemplates,
    defaultProjectStatusTemplate,
} from '@/lib/notifications/default-templates';

// ─── Types ──────────────────────────────────────────────────────────────────

type TriggerType = 'service_due' | 'project_status' | 'billing_generated';

interface BaseTrigger {
    id: string;
    type: TriggerType;
    subject: string;
    body: string;
    enabled: boolean;
    recipientMode: 'all' | 'specific';
    recipientClientIds: string[];
}

interface ServiceDueTrigger extends BaseTrigger {
    type: 'service_due';
    daysBefore: number;
}

interface ProjectStatusTrigger extends BaseTrigger {
    type: 'project_status';
    statusId: string;
}

interface BillingGeneratedTrigger extends BaseTrigger {
    type: 'billing_generated';
}

type EmailTrigger = ServiceDueTrigger | ProjectStatusTrigger | BillingGeneratedTrigger;

// ─── Trigger Metadata ───────────────────────────────────────────────────────

const TRIGGER_META: Record<TriggerType, {
    label: string;
    icon: typeof Bell;
    color: string;
    badgeClass: string;
    description: string;
    variables: string[];
}> = {
    service_due: {
        label: 'Vencimiento de Servicio',
        icon: Clock,
        color: 'text-amber-500',
        badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
        description: 'Se envía X días antes del vencimiento',
        variables: ['{{client_name}}', '{{service_name}}', '{{amount}}', '{{due_date}}', '{{days}}'],
    },
    project_status: {
        label: 'Cambio de Estado',
        icon: ArrowRightLeft,
        color: 'text-blue-500',
        badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
        description: 'Se envía cuando un proyecto cambia de estado',
        variables: ['{{client_name}}', '{{project_name}}', '{{status_name}}'],
    },
    billing_generated: {
        label: 'Cobro Generado',
        icon: Receipt,
        color: 'text-emerald-500',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
        description: 'Se envía al generar un cobro',
        variables: ['{{client_name}}', '{{service_name}}', '{{amount}}', '{{due_date}}'],
    },
};

// Tab definitions
const TAB_CONFIG = {
    services: {
        label: 'Servicios',
        icon: ListIcon,
        types: ['service_due', 'billing_generated'] as TriggerType[],
        emptyTitle: 'Sin notificaciones de servicios',
        emptyDescription: 'Usa "Crear Notificación" o "Cargar plantillas de ejemplo" para arrancar',
    },
    projects: {
        label: 'Proyectos',
        icon: SquareKanban,
        types: ['project_status', 'billing_generated'] as TriggerType[],
        emptyTitle: 'Sin notificaciones de proyectos',
        emptyDescription: 'Usa "Crear Notificación" para configurar emails al cambiar de estado',
    },
} as const;

type TabKey = keyof typeof TAB_CONFIG;
type Scope = 'services' | 'projects' | 'all';

// ─── Trigger Card ───────────────────────────────────────────────────────────

function TriggerCard({
    trigger,
    projectLists,
    clients,
    scope,
    onUpdate,
    onDelete,
}: {
    trigger: EmailTrigger;
    projectLists: ProjectList[];
    clients: Client[];
    scope: Scope;
    onUpdate: (id: string, field: string, value: any) => void;
    onDelete: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const meta = TRIGGER_META[trigger.type];
    const Icon = meta.icon;
    // billing_generated supports both {{service_name}} and {{project_name}}; show the relevant one in UI hint.
    const variables = (() => {
        if (trigger.type !== 'billing_generated') return meta.variables;
        if (scope === 'projects') return ['{{client_name}}', '{{project_name}}', '{{installment_label}}', '{{amount}}', '{{due_date}}'];
        return meta.variables;
    })();
    const isSpecific = trigger.recipientMode === 'specific';
    const specificEmpty = isSpecific && trigger.recipientClientIds.length === 0;
    const recipientLabel = isSpecific
        ? `${trigger.recipientClientIds.length} cliente${trigger.recipientClientIds.length === 1 ? '' : 's'}`
        : 'Todos los clientes';

    const toggleClient = (clientId: string) => {
        const current = trigger.recipientClientIds;
        const next = current.includes(clientId)
            ? current.filter((id) => id !== clientId)
            : [...current, clientId];
        onUpdate(trigger.id, 'recipientClientIds', next);
    };

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${trigger.enabled ? 'bg-card' : 'bg-muted/30 opacity-75'}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b">
                <Icon className={`h-4 w-4 ${meta.color} shrink-0`} />
                <Badge variant="outline" className={`${meta.badgeClass} text-[11px] font-medium`}>
                    {meta.label}
                </Badge>
                <Badge
                    variant="outline"
                    className={`text-[10px] font-normal ${specificEmpty ? 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/5' : ''}`}
                    title={specificEmpty ? 'Sin destinatarios: este trigger no enviará ningún email' : undefined}
                >
                    {specificEmpty ? '⚠ Sin destinatarios' : recipientLabel}
                </Badge>
                <div className="flex-1" />
                <Switch checked={trigger.enabled} onCheckedChange={(c) => onUpdate(trigger.id, 'enabled', c)} className="scale-90" />
                <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} className="h-7 w-7">
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(trigger.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Body */}
            {expanded && (
                <div className="px-4 py-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {trigger.type === 'service_due' && (
                            <div className="space-y-2">
                                <Label>Días antes del vencimiento</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="number" min="1" value={(trigger as ServiceDueTrigger).daysBefore}
                                        onChange={(e) => onUpdate(trigger.id, 'daysBefore', parseInt(e.target.value) || 0)} className="w-24" />
                                    <span className="text-sm text-muted-foreground">días</span>
                                </div>
                            </div>
                        )}
                        {trigger.type === 'project_status' && (
                            <div className="space-y-2">
                                <Label>Estado gatillador</Label>
                                <Select value={(trigger as ProjectStatusTrigger).statusId} onValueChange={(val) => onUpdate(trigger.id, 'statusId', val)}>
                                    <SelectTrig><SelectValue placeholder="Seleccionar estado" /></SelectTrig>
                                    <SelectContent>
                                        {projectLists.map(list => (
                                            <SelectItem key={list.id} value={list.id}>Al mover a: {list.title}</SelectItem>
                                        ))}
                                        {projectLists.length === 0 && <SelectItem value="none" disabled>No hay listas</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className={`space-y-2 ${trigger.type === 'billing_generated' ? 'sm:col-span-2 lg:col-span-3' : 'lg:col-span-2'}`}>
                            <Label>Asunto del correo</Label>
                            <Input placeholder="Ej: Aviso de pago próximo" value={trigger.subject}
                                onChange={(e) => onUpdate(trigger.id, 'subject', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Cuerpo del correo</Label>
                        <Textarea placeholder="Escribe el mensaje aquí..." className="min-h-[100px] font-mono text-sm"
                            value={trigger.body} onChange={(e) => onUpdate(trigger.id, 'body', e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-muted-foreground mr-1">Variables:</span>
                        {variables.map(v => (
                            <Badge key={v} variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => navigator.clipboard.writeText(v)} title="Click para copiar">
                                {v}
                            </Badge>
                        ))}
                    </div>

                    <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Destinatarios</Label>
                            <Select
                                value={trigger.recipientMode}
                                onValueChange={(val) => {
                                    onUpdate(trigger.id, 'recipientMode', val);
                                    if (val === 'all') onUpdate(trigger.id, 'recipientClientIds', []);
                                }}
                            >
                                <SelectTrig className="h-8 w-44 text-xs">
                                    <SelectValue />
                                </SelectTrig>
                                <SelectContent>
                                    <SelectItem value="all">Todos los clientes</SelectItem>
                                    <SelectItem value="specific">Clientes específicos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {specificEmpty && (
                            <div className="rounded-md border border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300 px-3 py-2 text-xs">
                                Este trigger está activo pero <strong>no enviará ningún email</strong> porque no tiene clientes seleccionados.
                            </div>
                        )}
                        {isSpecific && (
                            <div className="max-h-[140px] overflow-y-auto rounded-md border p-2 space-y-1">
                                {clients.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">No hay clientes en esta entidad.</p>
                                ) : clients.map(client => {
                                    const checked = trigger.recipientClientIds.includes(client.id);
                                    return (
                                        <label key={client.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 cursor-pointer text-xs">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleClient(client.id)}
                                                className="h-3.5 w-3.5"
                                            />
                                            <span className="flex-1 truncate">{client.name}</span>
                                            {client.email && <span className="text-muted-foreground truncate">{client.email}</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Tab Content ────────────────────────────────────────────────────────────

function TriggerTabContent({
    triggers,
    tabConfig,
    projectLists,
    clients,
    scope,
    onUpdate,
    onDelete,
}: {
    triggers: EmailTrigger[];
    tabConfig: (typeof TAB_CONFIG)[TabKey];
    projectLists: ProjectList[];
    clients: Client[];
    scope: Scope;
    onUpdate: (id: string, field: string, value: any) => void;
    onDelete: (id: string) => void;
}) {
    const filteredTriggers = triggers.filter(t => tabConfig.types.includes(t.type));

    return (
        <div className="space-y-4">
            {filteredTriggers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{tabConfig.emptyTitle}</p>
                    <p className="text-sm mt-1">{tabConfig.emptyDescription}</p>
                </div>
            ) : (
                <>
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="text-muted-foreground">
                            Cada trigger puede usar <strong>variables</strong> en el asunto y cuerpo del correo.
                            Haz click en una variable para copiarla al portapapeles.
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredTriggers.map(trigger => (
                            <TriggerCard key={trigger.id} trigger={trigger} projectLists={projectLists} clients={clients} scope={scope}
                                onUpdate={onUpdate} onDelete={onDelete} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface NotificationSettingsProps {
    entity?: Entity;
    scope?: Scope;
}

export function NotificationSettings({ entity, scope = 'all' }: NotificationSettingsProps = {}) {
    const { user } = useAuth();
    const { updateEntity } = useData();
    const [projectLists, setProjectLists] = useState<ProjectList[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [triggers, setTriggers] = useState<EmailTrigger[]>([]);
    const [loading, setLoading] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);

    // Load project lists + clients
    useEffect(() => {
        if (user) {
            getProjectLists(user.uid).then(setProjectLists).catch(console.error);
            getClients(user.uid).then(all => {
                if (entity) {
                    setClients(all.filter(c => c.entityId === entity.id));
                } else {
                    setClients(all);
                }
            }).catch(console.error);
        }
    }, [user, entity?.id]);

    // Load triggers from entity settings (single source of truth)
    useEffect(() => {
        if (!entity) return;
        const allTriggers: EmailTrigger[] = [];

        const loadRecipients = (t: any): { recipientMode: 'all' | 'specific'; recipientClientIds: string[] } => ({
            recipientMode: t.recipientMode === 'specific' ? 'specific' : 'all',
            recipientClientIds: Array.isArray(t.recipientClientIds) ? t.recipientClientIds : [],
        });

        const reminders = entity?.settings?.serviceSettings?.reminders;
        if (reminders && Array.isArray(reminders)) {
            reminders.forEach((r: any) => {
                allTriggers.push({
                    id: r.id || crypto.randomUUID(),
                    type: 'service_due',
                    daysBefore: r.daysBefore ?? 5,
                    subject: r.subject || '',
                    body: r.body || '',
                    enabled: r.enabled ?? true,
                    ...loadRecipients(r),
                });
            });
        }

        const statusTemplates = entity?.settings?.projectSettings?.statusChangeTemplates;
        if (statusTemplates && Array.isArray(statusTemplates)) {
            statusTemplates.forEach((t: any) => {
                allTriggers.push({
                    id: t.id || crypto.randomUUID(),
                    type: 'project_status',
                    statusId: t.id || '',
                    subject: t.subject || '',
                    body: t.body || '',
                    enabled: t.enabled ?? true,
                    ...loadRecipients(t),
                });
            });
        }

        const billing = entity?.settings?.notificationSettings?.billingTemplates;
        if (billing && Array.isArray(billing)) {
            billing.forEach((b: any) => {
                allTriggers.push({
                    id: b.id || crypto.randomUUID(),
                    type: 'billing_generated',
                    subject: b.subject || '',
                    body: b.body || '',
                    enabled: b.enabled ?? true,
                    ...loadRecipients(b),
                });
            });
        }

        setTriggers(allTriggers);
    }, [entity?.id, entity?.settings]);

    // CRUD handlers
    const handleUpdateTrigger = (id: string, field: string, value: any) => {
        setTriggers(triggers.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleDeleteTrigger = (id: string) => {
        setTriggers(triggers.filter(t => t.id !== id));
    };

    const handleSave = async () => {
        if (!entity) return;
        setLoading(true);
        try {
            const recipientFields = (t: EmailTrigger) => ({
                recipientMode: t.recipientMode,
                recipientClientIds: t.recipientMode === 'specific' ? t.recipientClientIds : [],
            });
            const serviceReminders = triggers.filter(t => t.type === 'service_due').map(t => ({
                id: t.id, daysBefore: (t as ServiceDueTrigger).daysBefore, subject: t.subject, body: t.body, enabled: t.enabled,
                ...recipientFields(t),
            }));
            const projectStatusTemplates = triggers.filter(t => t.type === 'project_status').map(t => ({
                id: (t as ProjectStatusTrigger).statusId, subject: t.subject, body: t.body, enabled: t.enabled,
                ...recipientFields(t),
            }));
            const billingTemplates = triggers.filter(t => t.type === 'billing_generated').map(t => ({
                id: t.id, subject: t.subject, body: t.body, enabled: t.enabled,
                ...recipientFields(t),
            }));

            await updateEntity(entity.id, {
                settings: {
                    ...entity.settings,
                    serviceSettings: { ...entity.settings?.serviceSettings, reminders: serviceReminders },
                    projectSettings: { ...entity.settings?.projectSettings, statusChangeTemplates: projectStatusTemplates },
                    notificationSettings: { ...entity.settings?.notificationSettings, billingTemplates },
                },
            });
            alert('Configuración de notificaciones guardada correctamente');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleWizardCreated = async (data: WizardData) => {
        if (!data.triggerType) return;

        const base = {
            id: crypto.randomUUID(),
            subject: data.subject,
            body: data.body,
            enabled: data.enabled,
            recipientMode: data.recipientMode,
            recipientClientIds: data.recipientMode === 'specific' ? data.selectedClientIds : [],
        };
        let newTrigger: EmailTrigger;

        switch (data.triggerType) {
            case 'service_due':
                newTrigger = { ...base, type: 'service_due', daysBefore: data.daysBefore };
                break;
            case 'project_status':
                newTrigger = { ...base, type: 'project_status', statusId: data.statusId };
                break;
            case 'billing_generated':
                newTrigger = { ...base, type: 'billing_generated' };
                break;
        }

        setTriggers(prev => [...prev, newTrigger]);
    };

    // Inyecta plantillas por defecto al estado (no guarda automáticamente).
    // No re-inyecta tipos que ya existen para evitar duplicados al click repetido.
    const handleLoadDefaults = () => {
        const additions: EmailTrigger[] = [];
        const hasService = triggers.some(t => t.type === 'service_due');
        const hasBilling = triggers.some(t => t.type === 'billing_generated');
        const hasProjectStatus = triggers.some(t => t.type === 'project_status');
        const baseRecipient = { recipientMode: 'all' as const, recipientClientIds: [] as string[] };

        if ((scope === 'services' || scope === 'all') && !hasService) {
            defaultServiceDueTemplates.forEach(d => {
                additions.push({
                    id: crypto.randomUUID(),
                    type: 'service_due',
                    daysBefore: d.daysBefore,
                    subject: d.subject,
                    body: d.body,
                    enabled: true,
                    ...baseRecipient,
                });
            });
        }

        if ((scope === 'projects' || scope === 'all') && projectLists.length > 0 && !hasProjectStatus) {
            additions.push({
                id: crypto.randomUUID(),
                type: 'project_status',
                statusId: projectLists[0].id,
                subject: defaultProjectStatusTemplate.subject,
                body: defaultProjectStatusTemplate.body,
                enabled: true,
                ...baseRecipient,
            });
        }

        // billing_generated aparece en ambos scopes (services y projects).
        // En scope='projects' usamos la plantilla con {{project_name}} y {{installment_label}}.
        if (!hasBilling) {
            const pool = scope === 'projects' ? defaultProjectBillingTemplates : defaultBillingTemplates;
            pool.forEach(d => {
                additions.push({
                    id: crypto.randomUUID(),
                    type: 'billing_generated',
                    subject: d.subject,
                    body: d.body,
                    enabled: true,
                    ...baseRecipient,
                });
            });
        }

        if (additions.length === 0) return;
        setTriggers(prev => [...prev, ...additions]);
    };

    // Counts per tab
    const counts = useMemo(() => {
        const result: Record<TabKey, number> = { services: 0, projects: 0 };
        triggers.forEach(t => {
            if (TAB_CONFIG.services.types.includes(t.type)) result.services++;
            if (TAB_CONFIG.projects.types.includes(t.type)) result.projects++;
        });
        return result;
    }, [triggers]);

    if (!entity) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>Selecciona una entidad para configurar notificaciones.</p>
            </div>
        );
    }

    // ── Scoped render: solo una "vista" (services o projects), sin tabs ──
    if (scope !== 'all') {
        const tabConfig = TAB_CONFIG[scope];
        const restrictTypes = tabConfig.types;
        const restrictedCount = counts[scope];
        const hasService = triggers.some(t => t.type === 'service_due');
        const hasBilling = triggers.some(t => t.type === 'billing_generated');
        const hasProjectStatus = triggers.some(t => t.type === 'project_status');
        const canLoadDefaults = scope === 'services'
            ? (!hasService || !hasBilling)
            : (!hasBilling || (!hasProjectStatus && projectLists.length > 0));

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Plantillas de Email</h2>
                        <p className="text-muted-foreground">
                            {scope === 'services'
                                ? 'Recordatorios de vencimiento y avisos de cobros generados.'
                                : 'Notificaciones cuando un proyecto cambia de estado.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {canLoadDefaults && (
                            <Button onClick={handleLoadDefaults} variant="outline" size="sm" className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Cargar plantillas de ejemplo
                            </Button>
                        )}
                        <Button onClick={() => setWizardOpen(true)} size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Crear Notificación
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <TriggerTabContent
                            triggers={triggers}
                            tabConfig={tabConfig}
                            projectLists={projectLists}
                            clients={clients}
                            scope={scope}
                            onUpdate={handleUpdateTrigger}
                            onDelete={handleDeleteTrigger}
                        />
                    </CardContent>
                    {restrictedCount > 0 && (
                        <CardFooter className="justify-end bg-muted/20 pt-6">
                            <Button onClick={handleSave} disabled={loading} size="lg">
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                                ) : (
                                    <><Save className="h-4 w-4 mr-2" /> Guardar Cambios</>
                                )}
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                <NotificationCreationWizard
                    open={wizardOpen}
                    onOpenChange={setWizardOpen}
                    onCreated={handleWizardCreated}
                    projectLists={projectLists}
                    clients={clients}
                    restrictTypes={restrictTypes as WizardTriggerType[]}
                />
            </div>
        );
    }

    // ── Full render: tabs Servicios | Proyectos (uso histórico en Configuración) ──
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Notificaciones de Email</h2>
                    <p className="text-muted-foreground">Configura los correos automáticos que se envían a tus clientes</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleLoadDefaults} variant="outline" size="sm" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Cargar plantillas de ejemplo
                    </Button>
                    <Button onClick={() => setWizardOpen(true)} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Crear Notificación
                    </Button>
                </div>
            </div>

            <Card>
                <Tabs defaultValue="services" className="w-full">
                    <div className="px-6 pt-6">
                        <TabsList className="grid w-full grid-cols-2 h-auto">
                            {(Object.keys(TAB_CONFIG) as TabKey[]).map(key => {
                                const config = TAB_CONFIG[key];
                                const Icon = config.icon;
                                return (
                                    <TabsTrigger key={key} value={key} className="gap-2">
                                        <Icon className="h-4 w-4" />
                                        {config.label}
                                        {counts[key] > 0 && (
                                            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
                                                {counts[key]}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    {(Object.keys(TAB_CONFIG) as TabKey[]).map(key => (
                        <TabsContent key={key} value={key}>
                            <CardContent className="pt-6">
                                <TriggerTabContent
                                    triggers={triggers}
                                    tabConfig={TAB_CONFIG[key]}
                                    projectLists={projectLists}
                                    clients={clients}
                                    scope={key as Scope}
                                    onUpdate={handleUpdateTrigger}
                                    onDelete={handleDeleteTrigger}
                                />
                            </CardContent>
                        </TabsContent>
                    ))}
                </Tabs>

                {triggers.length > 0 && (
                    <CardFooter className="justify-end bg-muted/20 pt-6">
                        <Button onClick={handleSave} disabled={loading} size="lg">
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                            ) : (
                                <><Save className="h-4 w-4 mr-2" /> Guardar Cambios</>
                            )}
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <NotificationCreationWizard
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                onCreated={handleWizardCreated}
                projectLists={projectLists}
                clients={clients}
            />
        </div>
    );
}
