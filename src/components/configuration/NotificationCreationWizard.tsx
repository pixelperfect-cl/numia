/**
 * Numia v1.0 - Notification Creation Wizard
 * 
 * Guided experience for creating email notification triggers.
 * Steps: 1. Destinatarios → 2. Trigger → 3. Contenido del Email
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  ArrowRightLeft,
  Receipt,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Users,
  Zap,
  FileText,
  User,
  UserCheck,
} from 'lucide-react';
import type { ProjectList, Client } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TriggerType = 'service_due' | 'project_status' | 'billing_generated';

export type RecipientMode = 'all' | 'specific';

export interface WizardData {
  // Step 1: Recipients
  recipientMode: RecipientMode;
  selectedClientIds: string[];
  // Step 2: Trigger
  triggerType: TriggerType | null;
  daysBefore: number;
  statusId: string;
  // Step 3: Email content
  subject: string;
  body: string;
  enabled: boolean;
}

export const INITIAL_WIZARD_DATA: WizardData = {
  recipientMode: 'all',
  selectedClientIds: [],
  triggerType: null,
  daysBefore: 5,
  statusId: '',
  subject: '',
  body: '',
  enabled: true,
};

// ─── Step Metadata ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Destinatarios', icon: Users },
  { id: 2, label: 'Trigger', icon: Zap },
  { id: 3, label: 'Contenido', icon: FileText },
] as const;

const TRIGGER_OPTIONS: { value: TriggerType; label: string; description: string; icon: typeof Clock; color: string }[] = [
  { value: 'service_due', label: 'Vencimiento de Servicio', description: 'Se envía X días antes del vencimiento de un servicio', icon: Clock, color: 'text-amber-500' },
  { value: 'project_status', label: 'Cambio de Estado de Proyecto', description: 'Se envía cuando un proyecto cambia a un estado específico', icon: ArrowRightLeft, color: 'text-blue-500' },
  { value: 'billing_generated', label: 'Cobro Generado', description: 'Se envía cuando se genera un cobro de servicio o proyecto', icon: Receipt, color: 'text-emerald-500' },
];

const TRIGGER_VARIABLES: Record<TriggerType, string[]> = {
  service_due: ['{{client_name}}', '{{service_name}}', '{{amount}}', '{{due_date}}', '{{days}}'],
  project_status: ['{{client_name}}', '{{project_name}}', '{{status_name}}'],
  billing_generated: ['{{client_name}}', '{{service_name}}', '{{amount}}', '{{due_date}}'],
};

// ─── Stepper ────────────────────────────────────────────────────────────────

function WizardStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[11px] font-medium transition-colors ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 rounded-full transition-colors duration-300 mt-[-18px] ${
                isCompleted ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Recipients ─────────────────────────────────────────────────────

function RecipientsStep({
  data,
  onChange,
  clients,
}: {
  data: WizardData;
  onChange: (field: keyof WizardData, value: any) => void;
  clients: Client[];
}) {
  const toggleClient = (clientId: string) => {
    const current = data.selectedClientIds;
    if (current.includes(clientId)) {
      onChange('selectedClientIds', current.filter(id => id !== clientId));
    } else {
      onChange('selectedClientIds', [...current, clientId]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">¿A quién se enviará esta notificación por email?</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* All clients */}
        <button
          onClick={() => { onChange('recipientMode', 'all'); onChange('selectedClientIds', []); }}
          className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
            data.recipientMode === 'all'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/40 hover:bg-accent/50'
          }`}
        >
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            data.recipientMode === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            <Users className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sm">Todos los clientes</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se aplica automáticamente a todos los clientes de la entidad
            </p>
          </div>
          {data.recipientMode === 'all' && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
        </button>

        {/* Specific clients */}
        <button
          onClick={() => onChange('recipientMode', 'specific')}
          className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
            data.recipientMode === 'specific'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/40 hover:bg-accent/50'
          }`}
        >
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            data.recipientMode === 'specific' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sm">Clientes específicos</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecciona los clientes que recibirán esta notificación
            </p>
          </div>
          {data.recipientMode === 'specific' && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
        </button>
      </div>

      {/* Client selection list */}
      {data.recipientMode === 'specific' && (
        <div className="mt-4 space-y-2">
          <Label className="text-sm font-medium">Selecciona clientes</Label>
          {clients.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No hay clientes registrados
            </div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-lg p-2">
              {clients.map(client => (
                <label
                  key={client.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={data.selectedClientIds.includes(client.id)}
                    onCheckedChange={() => toggleClient(client.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{client.name}</div>
                    {client.email && (
                      <div className="text-xs text-muted-foreground truncate">{client.email}</div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {client.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </label>
              ))}
            </div>
          )}
          {data.selectedClientIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.selectedClientIds.length} cliente{data.selectedClientIds.length !== 1 ? 's' : ''} seleccionado{data.selectedClientIds.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Trigger Type ───────────────────────────────────────────────────

function TriggerTypeStep({
  data,
  onSelect,
  projectLists,
  onChange,
}: {
  data: WizardData;
  onSelect: (type: TriggerType) => void;
  projectLists: ProjectList[];
  onChange: (field: keyof WizardData, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">¿Qué evento dispara esta notificación?</p>

      <div className="grid gap-3">
        {TRIGGER_OPTIONS.map(option => {
          const Icon = option.icon;
          const isSelected = data.triggerType === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40 hover:bg-accent/50'
              }`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                <Icon className={`h-4 w-4 ${isSelected ? '' : option.color}`} />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-sm">{option.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Inline config for selected trigger */}
      {data.triggerType === 'service_due' && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
          <Label>Días antes del vencimiento</Label>
          <div className="flex items-center gap-3">
            <Input type="number" min={1} value={data.daysBefore}
              onChange={(e) => onChange('daysBefore', parseInt(e.target.value) || 1)} className="w-28" />
            <span className="text-sm text-muted-foreground">días antes</span>
          </div>
        </div>
      )}

      {data.triggerType === 'project_status' && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
          <Label>Estado gatillador</Label>
          <Select value={data.statusId} onValueChange={(val) => onChange('statusId', val)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
            <SelectContent>
              {projectLists.map(list => (
                <SelectItem key={list.id} value={list.id}>Al mover a: {list.title}</SelectItem>
              ))}
              {projectLists.length === 0 && <SelectItem value="none" disabled>No hay listas</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      )}

      {data.triggerType === 'billing_generated' && (
        <div className="p-4 border rounded-lg bg-muted/30 text-center">
          <Receipt className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
          <p className="text-sm text-muted-foreground">Se disparará automáticamente al generar un cobro.</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Email Content ──────────────────────────────────────────────────

function EmailContentStep({ data, onChange }: { data: WizardData; onChange: (field: keyof WizardData, value: any) => void }) {
  const variables = data.triggerType ? TRIGGER_VARIABLES[data.triggerType] : [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Asunto del correo</Label>
        <Input placeholder="Ej: Aviso de pago próximo - {{service_name}}" value={data.subject}
          onChange={(e) => onChange('subject', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Cuerpo del correo</Label>
        <Textarea placeholder="Escribe el mensaje aquí..." className="min-h-[120px] font-mono text-sm"
          value={data.body} onChange={(e) => onChange('body', e.target.value)} />
      </div>

      {variables.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Variables disponibles (click para copiar):</span>
          <div className="flex flex-wrap gap-1.5">
            {variables.map(v => (
              <Badge key={v} variant="outline"
                className="text-[10px] font-mono px-2 py-0.5 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigator.clipboard.writeText(v)} title="Click para copiar">
                {v}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Wizard ────────────────────────────────────────────────────────────

interface NotificationCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (data: WizardData) => void;
  projectLists: ProjectList[];
  clients: Client[];
  initialTriggerType?: TriggerType;
}

export function NotificationCreationWizard({ open, onOpenChange, onCreated, projectLists, clients, initialTriggerType }: NotificationCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({ ...INITIAL_WIZARD_DATA });
  const [loading, setLoading] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setData({ ...INITIAL_WIZARD_DATA });
      }, 200);
    } else if (initialTriggerType) {
      setData(prev => ({ ...prev, triggerType: initialTriggerType }));
    }
  }, [open, initialTriggerType]);

  const updateField = (field: keyof WizardData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        if (data.recipientMode === 'all') return true;
        return data.selectedClientIds.length > 0;
      case 2:
        if (!data.triggerType) return false;
        if (data.triggerType === 'service_due') return data.daysBefore > 0;
        if (data.triggerType === 'project_status') return data.statusId !== '';
        return true;
      case 3:
        return data.subject.trim() !== '' && data.body.trim() !== '';
      default: return false;
    }
  };

  const handleNext = () => { if (step < 3) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await onCreated(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating notification trigger:', error);
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<number, { title: string; description: string }> = {
    1: { title: '¿Para quién?', description: 'Selecciona los destinatarios de la notificación' },
    2: { title: '¿Cuándo se envía?', description: 'Elige qué evento dispara el envío del email' },
    3: { title: '¿Qué dice?', description: 'Define el contenido del correo electrónico' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stepTitles[step]?.title}</DialogTitle>
          <DialogDescription>{stepTitles[step]?.description}</DialogDescription>
        </DialogHeader>

        <WizardStepper currentStep={step} />

        <div className="min-h-[200px]">
          {step === 1 && (
            <RecipientsStep data={data} onChange={updateField} clients={clients} />
          )}
          {step === 2 && (
            <TriggerTypeStep
              data={data}
              onSelect={(type) => updateField('triggerType', type)}
              projectLists={projectLists}
              onChange={updateField}
            />
          )}
          {step === 3 && (
            <EmailContentStep data={data} onChange={updateField} />
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 1 ? () => onOpenChange(false) : handleBack} className="gap-2">
            {step === 1 ? 'Cancelar' : <><ChevronLeft className="h-4 w-4" /> Atrás</>}
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={!canProceed() || loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Crear Notificación
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
