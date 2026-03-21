/**
 * Numia v1.0 - Unified Email Templates & Notifications Panel
 * 
 * Consolidates all email template configuration (services, projects, scheduled, billing)
 * into a single professional panel under Entity Configuration.
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectLists } from '@/lib/supabase/database';
import {
    Save,
    Plus,
    Trash2,
    Bell,
    Clock,
    CalendarClock,
    ArrowRightLeft,
    Receipt,
    Zap,
    ChevronDown,
    ChevronUp,
    Info,
    Loader2,
} from 'lucide-react';
import type { Entity, ProjectList } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type TriggerType = 'service_due' | 'project_status' | 'scheduled' | 'billing_generated';

interface BaseTrigger {
    id: string;
    type: TriggerType;
    subject: string;
    body: string;
    enabled: boolean;
}

interface ServiceDueTrigger extends BaseTrigger {
    type: 'service_due';
    daysBefore: number;
}

interface ProjectStatusTrigger extends BaseTrigger {
    type: 'project_status';
    statusId: string; // project list ID
}

interface ScheduledTrigger extends BaseTrigger {
    type: 'scheduled';
    schedule: 'once' | 'daily' | 'weekly' | 'monthly';
    date?: string; // ISO date for 'once'
    dayOfWeek?: number; // 0-6 for 'weekly'
    dayOfMonth?: number; // 1-31 for 'monthly'
}

interface BillingGeneratedTrigger extends BaseTrigger {
    type: 'billing_generated';
}

type EmailTrigger = ServiceDueTrigger | ProjectStatusTrigger | ScheduledTrigger | BillingGeneratedTrigger;

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
        description: 'Se envía X días antes de la fecha de vencimiento de un servicio',
        variables: ['{{client_name}}', '{{service_name}}', '{{amount}}', '{{due_date}}', '{{days}}'],
    },
    project_status: {
        label: 'Cambio de Estado de Proyecto',
        icon: ArrowRightLeft,
        color: 'text-blue-500',
        badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
        description: 'Se envía cuando un proyecto se mueve a un estado específico',
        variables: ['{{client_name}}', '{{project_name}}', '{{status_name}}'],
    },
    scheduled: {
        label: 'Fecha Programada',
        icon: CalendarClock,
        color: 'text-purple-500',
        badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
        description: 'Se envía en una fecha fija o de forma periódica',
        variables: ['{{client_name}}', '{{entity_name}}', '{{date}}'],
    },
    billing_generated: {
        label: 'Cobro Generado',
        icon: Receipt,
        color: 'text-emerald-500',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
        description: 'Se envía cuando se genera un cobro automático',
        variables: ['{{client_name}}', '{{service_name}}', '{{amount}}', '{{due_date}}'],
    },
};


// ─── Trigger Card ───────────────────────────────────────────────────────────

function TriggerCard({
    trigger,
    projectLists,
    onUpdate,
    onDelete,
}: {
    trigger: EmailTrigger;
    projectLists: ProjectList[];
    onUpdate: (id: string, field: string, value: any) => void;
    onDelete: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const meta = TRIGGER_META[trigger.type];
    const Icon = meta.icon;

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${trigger.enabled ? 'bg-card' : 'bg-muted/30 opacity-75'}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b">
                <Icon className={`h-4 w-4 ${meta.color} shrink-0`} />
                <Badge variant="outline" className={`${meta.badgeClass} text-[11px] font-medium`}>
                    {meta.label}
                </Badge>

                <div className="flex-1" />

                <Switch
                    checked={trigger.enabled}
                    onCheckedChange={(c) => onUpdate(trigger.id, 'enabled', c)}
                    className="scale-90"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpanded(!expanded)}
                    className="h-7 w-7"
                >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(trigger.id)}
                    className="h-7 w-7 text-destructive hover:text-destructive"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Body */}
            {expanded && (
                <div className="px-4 py-4 space-y-4">
                    {/* Trigger condition */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Type-specific condition */}
                        {trigger.type === 'service_due' && (
                            <div className="space-y-2">
                                <Label>Días antes del vencimiento</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={(trigger as ServiceDueTrigger).daysBefore}
                                        onChange={(e) => onUpdate(trigger.id, 'daysBefore', parseInt(e.target.value) || 0)}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">días</span>
                                </div>
                            </div>
                        )}

                        {trigger.type === 'project_status' && (
                            <div className="space-y-2">
                                <Label>Estado gatillador</Label>
                                <Select
                                    value={(trigger as ProjectStatusTrigger).statusId}
                                    onValueChange={(val) => onUpdate(trigger.id, 'statusId', val)}
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
                        )}

                        {trigger.type === 'scheduled' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Frecuencia</Label>
                                    <Select
                                        value={(trigger as ScheduledTrigger).schedule}
                                        onValueChange={(val) => onUpdate(trigger.id, 'schedule', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="once">Única vez</SelectItem>
                                            <SelectItem value="daily">Diario</SelectItem>
                                            <SelectItem value="weekly">Semanal</SelectItem>
                                            <SelectItem value="monthly">Mensual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(trigger as ScheduledTrigger).schedule === 'once' && (
                                    <div className="space-y-2">
                                        <Label>Fecha</Label>
                                        <Input
                                            type="date"
                                            value={(trigger as ScheduledTrigger).date || ''}
                                            onChange={(e) => onUpdate(trigger.id, 'date', e.target.value)}
                                        />
                                    </div>
                                )}
                                {(trigger as ScheduledTrigger).schedule === 'weekly' && (
                                    <div className="space-y-2">
                                        <Label>Día de la semana</Label>
                                        <Select
                                            value={String((trigger as ScheduledTrigger).dayOfWeek ?? 1)}
                                            onValueChange={(val) => onUpdate(trigger.id, 'dayOfWeek', parseInt(val))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Lunes</SelectItem>
                                                <SelectItem value="2">Martes</SelectItem>
                                                <SelectItem value="3">Miércoles</SelectItem>
                                                <SelectItem value="4">Jueves</SelectItem>
                                                <SelectItem value="5">Viernes</SelectItem>
                                                <SelectItem value="6">Sábado</SelectItem>
                                                <SelectItem value="0">Domingo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {(trigger as ScheduledTrigger).schedule === 'monthly' && (
                                    <div className="space-y-2">
                                        <Label>Día del mes</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={(trigger as ScheduledTrigger).dayOfMonth ?? 1}
                                            onChange={(e) => onUpdate(trigger.id, 'dayOfMonth', parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Subject - spans remaining cols */}
                        <div className={`space-y-2 ${trigger.type === 'billing_generated' ? 'sm:col-span-2 lg:col-span-3' : 'lg:col-span-2'}`}>
                            <Label>Asunto del correo</Label>
                            <Input
                                placeholder="Ej: Aviso de pago próximo"
                                value={trigger.subject}
                                onChange={(e) => onUpdate(trigger.id, 'subject', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Body */}
                    <div className="space-y-2">
                        <Label>Cuerpo del correo</Label>
                        <Textarea
                            placeholder="Escribe el mensaje aquí..."
                            className="min-h-[100px] font-mono text-sm"
                            value={trigger.body}
                            onChange={(e) => onUpdate(trigger.id, 'body', e.target.value)}
                        />
                    </div>

                    {/* Variables help */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-muted-foreground mr-1">Variables:</span>
                        {meta.variables.map(v => (
                            <Badge
                                key={v}
                                variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => {
                                    navigator.clipboard.writeText(v);
                                }}
                                title="Click para copiar"
                            >
                                {v}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Add Trigger Button ─────────────────────────────────────────────────────

function AddTriggerButton({ onAdd }: { onAdd: (type: TriggerType) => void }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <Button
                variant="outline"
                className="w-full border-dashed gap-2"
                onClick={() => setOpen(!open)}
            >
                <Plus className="h-4 w-4" />
                Añadir Trigger de Email
                {open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </Button>

            {open && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(Object.keys(TRIGGER_META) as TriggerType[]).map(type => {
                        const meta = TRIGGER_META[type];
                        const Icon = meta.icon;
                        return (
                            <button
                                key={type}
                                onClick={() => { onAdd(type); setOpen(false); }}
                                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 text-left transition-colors cursor-pointer"
                            >
                                <Icon className={`h-5 w-5 ${meta.color} mt-0.5 shrink-0`} />
                                <div>
                                    <div className="text-sm font-medium">{meta.label}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{meta.description}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface EmailTemplatesPanelProps {
    entity: Entity;
    filterTypes?: TriggerType[];
    hideHeader?: boolean;
}

export function EmailTemplatesPanel({ entity, filterTypes, hideHeader }: EmailTemplatesPanelProps) {
    const { user } = useAuth();
    const { updateEntity } = useData();
    const [projectLists, setProjectLists] = useState<ProjectList[]>([]);
    const [triggers, setTriggers] = useState<EmailTrigger[]>([]);
    const [loading, setLoading] = useState(false);

    // Load project lists for the project_status trigger
    useEffect(() => {
        if (user) {
            getProjectLists(user.uid).then(lists => setProjectLists(lists)).catch(console.error);
        }
    }, [user]);

    // Load triggers from entity settings (merge all sources)
    useEffect(() => {
        const allTriggers: EmailTrigger[] = [];

        // Service reminders → ServiceDueTrigger
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
                });
            });
        }

        // Project status templates → ProjectStatusTrigger
        const statusTemplates = entity?.settings?.projectSettings?.statusChangeTemplates;
        if (statusTemplates && Array.isArray(statusTemplates)) {
            statusTemplates.forEach((t: any) => {
                allTriggers.push({
                    id: t.id || crypto.randomUUID(),
                    type: 'project_status',
                    statusId: t.id || '', // legacy used `id` as the status ID
                    subject: t.subject || '',
                    body: t.body || '',
                    enabled: t.enabled ?? true,
                });
            });
        }

        // Scheduled templates
        const scheduled = entity?.settings?.notificationSettings?.scheduledTemplates;
        if (scheduled && Array.isArray(scheduled)) {
            scheduled.forEach((s: any) => {
                allTriggers.push({
                    id: s.id || crypto.randomUUID(),
                    type: 'scheduled',
                    schedule: s.schedule || 'once',
                    date: s.date,
                    dayOfWeek: s.dayOfWeek,
                    dayOfMonth: s.dayOfMonth,
                    subject: s.subject || '',
                    body: s.body || '',
                    enabled: s.enabled ?? true,
                });
            });
        }

        // Billing generated templates
        const billing = entity?.settings?.notificationSettings?.billingTemplates;
        if (billing && Array.isArray(billing)) {
            billing.forEach((b: any) => {
                allTriggers.push({
                    id: b.id || crypto.randomUUID(),
                    type: 'billing_generated',
                    subject: b.subject || '',
                    body: b.body || '',
                    enabled: b.enabled ?? true,
                });
            });
        }

        setTriggers(allTriggers);
    }, [entity?.id, entity?.settings]);

    // Handlers
    const handleAddTrigger = (type: TriggerType) => {
        const base = {
            id: crypto.randomUUID(),
            subject: '',
            body: '',
            enabled: true,
        };

        let newTrigger: EmailTrigger;
        switch (type) {
            case 'service_due':
                newTrigger = { ...base, type: 'service_due', daysBefore: 5 };
                break;
            case 'project_status':
                newTrigger = { ...base, type: 'project_status', statusId: projectLists[0]?.id || '' };
                break;
            case 'scheduled':
                newTrigger = { ...base, type: 'scheduled', schedule: 'monthly', dayOfMonth: 1 };
                break;
            case 'billing_generated':
                newTrigger = { ...base, type: 'billing_generated' };
                break;
        }

        setTriggers([...triggers, newTrigger]);
    };

    const handleUpdateTrigger = (id: string, field: string, value: any) => {
        setTriggers(triggers.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleDeleteTrigger = (id: string) => {
        setTriggers(triggers.filter(t => t.id !== id));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Split triggers back into their storage locations
            const serviceReminders = triggers
                .filter(t => t.type === 'service_due')
                .map(t => ({
                    id: t.id,
                    daysBefore: (t as ServiceDueTrigger).daysBefore,
                    subject: t.subject,
                    body: t.body,
                    enabled: t.enabled,
                }));

            const projectStatusTemplates = triggers
                .filter(t => t.type === 'project_status')
                .map(t => ({
                    id: (t as ProjectStatusTrigger).statusId,
                    subject: t.subject,
                    body: t.body,
                    enabled: t.enabled,
                }));

            const scheduledTemplates = triggers
                .filter(t => t.type === 'scheduled')
                .map(t => ({
                    id: t.id,
                    schedule: (t as ScheduledTrigger).schedule,
                    date: (t as ScheduledTrigger).date,
                    dayOfWeek: (t as ScheduledTrigger).dayOfWeek,
                    dayOfMonth: (t as ScheduledTrigger).dayOfMonth,
                    subject: t.subject,
                    body: t.body,
                    enabled: t.enabled,
                }));

            const billingTemplates = triggers
                .filter(t => t.type === 'billing_generated')
                .map(t => ({
                    id: t.id,
                    subject: t.subject,
                    body: t.body,
                    enabled: t.enabled,
                }));

            const updatedSettings = {
                ...entity.settings,
                serviceSettings: {
                    ...entity.settings?.serviceSettings,
                    reminders: serviceReminders,
                },
                projectSettings: {
                    ...entity.settings?.projectSettings,
                    statusChangeTemplates: projectStatusTemplates,
                },
                notificationSettings: {
                    ...entity.settings?.notificationSettings,
                    scheduledTemplates,
                    billingTemplates,
                },
            };

            await updateEntity(entity.id, { settings: updatedSettings });
            alert('Configuración de notificaciones guardada correctamente');
        } catch (error) {
            console.error('Error saving notification settings:', error);
            alert('Error al guardar la configuración');
        } finally {
            setLoading(false);
        }
    };

    // Filter triggers by type if specified
    const displayedTriggers = useMemo(() => {
        if (!filterTypes || filterTypes.length === 0) return triggers;
        return triggers.filter(t => filterTypes.includes(t.type));
    }, [triggers, filterTypes]);

    const totalEnabled = displayedTriggers.filter(t => t.enabled).length;

    return (
        <div className="space-y-6">
            {/* Email Triggers */}
            <Card>
                {!hideHeader && (
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-primary" />
                                <CardTitle>Triggers de Email</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                    {totalEnabled} activo{totalEnabled !== 1 ? 's' : ''}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {displayedTriggers.length} total
                                </Badge>
                            </div>
                        </div>
                        <CardDescription>
                            Configura correos automáticos que se enviarán a los clientes en base a diferentes eventos.
                            Cada trigger define cuándo y qué correo se envía.
                        </CardDescription>
                    </CardHeader>
                )}
                <CardContent className={`space-y-4 ${hideHeader ? 'pt-6' : ''}`}>
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="text-muted-foreground">
                            Cada trigger puede usar <strong>variables</strong> en el asunto y cuerpo del correo.
                            Haz click en una variable para copiarla al portapapeles.
                        </div>
                    </div>

                    {/* Trigger list */}
                    {displayedTriggers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No hay triggers configurados</p>
                            <p className="text-sm mt-1">Añade un trigger para enviar correos automáticos a tus clientes</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {displayedTriggers.map(trigger => (
                                <TriggerCard
                                    key={trigger.id}
                                    trigger={trigger}
                                    projectLists={projectLists}
                                    onUpdate={handleUpdateTrigger}
                                    onDelete={handleDeleteTrigger}
                                />
                            ))}
                        </div>
                    )}

                    {/* Add trigger */}
                    <AddTriggerButton onAdd={handleAddTrigger} />
                </CardContent>
                <CardFooter className="justify-end bg-muted/20 pt-6">
                    <Button onClick={handleSave} disabled={loading} size="lg">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar Triggers
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
