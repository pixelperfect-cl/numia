import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Briefcase, Calendar as CalendarIcon, DollarSign, User, Pencil, RefreshCw, ChevronRight, Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { Client, Project } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ClientSelectionDialog } from "@/components/erp/ClientSelectionDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { updateProject } from "@/lib/supabase/database";
import { uploadProjectLogo } from "@/lib/supabase/storage";
import { toast } from "sonner";

interface ProjectDetailsWidgetProps {
    project: Project;
    client?: Client | null;
    onUpdate: (project: Project) => void;
    onClientChange: (newClient: Client) => void;
    className?: string; // Add className prop
}

export function ProjectDetailsWidget({ project, client, onUpdate, onClientChange, className }: ProjectDetailsWidgetProps) {
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [cost, setCost] = useState(project.amount?.toString() || "");
    const [isEditingCost, setIsEditingCost] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [logoUploading, setLogoUploading] = useState(false);

    // Sync local state with project prop
    useEffect(() => {
        setCost(project.amount?.toString() || "");
    }, [project.amount]);

    const handleClientSelect = (selectedClient: Client) => {
        onClientChange(selectedClient);
        setIsClientDialogOpen(false);
    };

    const handleDateUpdate = async (field: 'startDate' | 'dueDate', date: Date | undefined) => {
        if (!date) return;
        const isoDate = date.toISOString();

        // Optimistic update handled by parent usually, but we call API here
        try {
            await updateProject(project.id, { [field]: isoDate });
            onUpdate({ ...project, [field]: isoDate });
            // Notify header and other listeners that project data changed
            window.dispatchEvent(new CustomEvent('project-updated', { detail: { projectId: project.id } }));
        } catch (error) {
            console.error(`Failed to update ${field}`, error);
        }
    };

    const handleCostSave = async () => {
        setIsEditingCost(false);
        const newCost = parseFloat(cost);

        if (isNaN(newCost)) return; // Or handle reset

        if (newCost !== project.amount) {
            try {
                await updateProject(project.id, { amount: newCost });
                onUpdate({ ...project, amount: newCost });
            } catch (error) {
                console.error("Failed to update amount", error);
            }
        }
    };

    return (
        <Card className={cn("h-full border-none shadow-none bg-muted/20", className)}>
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Detalles del Proyecto
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

                {/* Logo Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Logo</Label>
                        <div className="flex items-center gap-1">
                            {project.logoUrl && (
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/60 hover:text-destructive" onClick={async () => {
                                    try {
                                        await updateProject(project.id, { logoUrl: '' });
                                        onUpdate({ ...project, logoUrl: undefined });
                                        toast.success('Logo eliminado');
                                    } catch (err) {
                                        toast.error('Error al eliminar el logo');
                                    }
                                }}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => logoInputRef.current?.click()}>
                                <Pencil className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLogoUploading(true);
                        try {
                            const url = await uploadProjectLogo(file, project.id);
                            const cacheBustedUrl = url + '?t=' + Date.now();
                            await updateProject(project.id, { logoUrl: cacheBustedUrl });
                            onUpdate({ ...project, logoUrl: cacheBustedUrl });
                            toast.success('Logo actualizado');
                        } catch (err) {
                            console.error('Logo upload error:', err);
                            toast.error('Error al subir el logo');
                        } finally {
                            setLogoUploading(false);
                            e.target.value = '';
                        }
                    }} />
                    <div
                        className="relative w-full rounded-lg border border-dashed border-border/60 bg-background/50 flex items-center justify-center cursor-pointer group hover:border-primary/40 hover:bg-primary/5 transition-all overflow-hidden"
                        style={{ minHeight: '80px' }}
                        onClick={() => logoInputRef.current?.click()}
                    >
                        {logoUploading ? (
                            <div className="flex flex-col items-center gap-2 py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Subiendo...</span>
                            </div>
                        ) : project.logoUrl ? (
                            <>
                                <img
                                    src={project.logoUrl}
                                    alt={project.name}
                                    className="max-h-24 max-w-full w-auto object-contain p-3"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Upload className="h-4 w-4 text-white" />
                                    <span className="text-xs text-white font-medium">Cambiar logo</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground group-hover:text-primary transition-colors">
                                <ImageIcon className="h-8 w-8 opacity-40" />
                                <span className="text-xs">Click para subir logo</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Client Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cliente</Label>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => setIsClientDialogOpen(true)}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                    </div>

                    {client ? (
                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-background/50 transition-colors cursor-pointer group" onClick={() => setIsClientDialogOpen(true)}>
                            <Avatar className="h-9 w-9 border ring-1 ring-border/50">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {client.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate leading-none mb-1 group-hover:text-primary transition-colors">{client.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{client.email || 'Sin contacto'}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-md bg-background/50 text-center">
                            <p className="text-xs text-muted-foreground mb-2">Sin cliente asignado</p>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsClientDialogOpen(true)}>
                                Asignar Cliente
                            </Button>
                        </div>
                    )}

                    <ClientSelectionDialog
                        open={isClientDialogOpen}
                        onOpenChange={setIsClientDialogOpen}
                        onSelect={handleClientSelect}
                    />
                </div>

                <div className="h-px bg-border/50" />

                {/* Dates Section */}
                <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Plazos</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <DateSelector
                            label="Inicio"
                            date={project.startDate ? new Date(project.startDate) : (project.createdAt ? new Date(project.createdAt) : undefined)}
                            onChange={(date) => handleDateUpdate('startDate', date)}
                        />
                        <DateSelector
                            label="Entrega"
                            date={project.dueDate ? new Date(project.dueDate) : undefined}
                            onChange={(date) => handleDateUpdate('dueDate', date)}
                        />
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Financial Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Presupuesto</Label>
                        {!isEditingCost && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => setIsEditingCost(true)}>
                                <Pencil className="h-3 w-3" />
                            </Button>
                        )}
                    </div>

                    {isEditingCost ? (
                        <div className="space-y-2">
                            <div className="relative flex-1">
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    className="pl-7 h-8 text-sm"
                                    value={cost}
                                    onChange={(e) => setCost(e.target.value)}
                                    type="number"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCostSave()}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" className="h-7 flex-1" onClick={handleCostSave}>
                                    Guardar
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => { setCost(project.amount?.toString() || ""); setIsEditingCost(false); }}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2" onClick={() => setIsEditingCost(true)}>
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground tracking-tight">
                                    {(project.amount || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Costo Total Estimado</p>
                            </div>
                        </div>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}

function DateSelector({ label, date, onChange, disabled }: { label: string, date?: Date, onChange?: (date: Date | undefined) => void, disabled?: boolean }) {
    return (
        <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "w-full justify-start text-left font-normal h-9 px-2.5",
                            !date && "text-muted-foreground",
                            date && "font-medium"
                        )}
                        disabled={disabled}
                    >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                        {date ? format(date, "dd MMM, yy", { locale: es }) : <span className="text-xs">Definir fecha</span>}
                    </Button>
                </PopoverTrigger>
                {!disabled && onChange && (
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={onChange}
                            initialFocus
                            locale={es}
                        />
                    </PopoverContent>
                )}
            </Popover>
        </div>
    )
}
