import { EnhancedSubscription, ServiceChecklist, ServiceChecklistItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { updateSubscription } from '@/lib/supabase/database';
import { Plus, Trash, X, ListChecks, CheckCircle2, Circle, Clock } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ServiceChecklistTabProps {
    subscription: EnhancedSubscription;
    onUpdate: (updated: EnhancedSubscription) => void;
}

export function ServiceChecklistTab({ subscription, onUpdate }: ServiceChecklistTabProps) {
    const handleUpdateChecklists = async (newChecklists: ServiceChecklist[]) => {
        const updatedSub = { ...subscription, checklists: newChecklists };

        // Optimistic update
        onUpdate(updatedSub);

        try {
            await updateSubscription(subscription.id, { checklists: newChecklists });
        } catch (error) {
            console.error("Failed to update service checklists", error);
        }
    };

    const checklists = subscription.checklists || [];

    const milestones = checklists.map(list => {
        const total = list.items.length;
        const completedItems = list.items.filter(i => i.completed).length;
        let status: 'pending' | 'active' | 'completed' = 'pending';
        if (total > 0) {
            if (completedItems === total) status = 'completed';
            else if (completedItems > 0) status = 'active';
        }
        return { id: list.id, title: list.title, status };
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold tracking-tight">Checklists</h3>
                    <p className="text-xs text-muted-foreground">Gestiona tareas y seguimiento del servicio.</p>
                </div>
                <Button
                    size="sm"
                    onClick={() => {
                        const newChecklist: ServiceChecklist = {
                            id: crypto.randomUUID(),
                            title: 'Nueva Lista',
                            items: []
                        };
                        handleUpdateChecklists([...checklists, newChecklist]);
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" /> Nueva Lista
                </Button>
            </div>

            {/* Milestone Badges */}
            {milestones.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
                    {milestones.map((m, i) => (
                        <div key={m.id} className="flex items-center shrink-0">
                            <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors",
                                m.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" :
                                    m.status === 'active' ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" :
                                        "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700"
                            )}>
                                {m.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : m.status === 'active' ? <Clock className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                                {m.title}
                            </div>
                            {i < milestones.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {checklists.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ListChecks className="h-8 w-8 opacity-50" />
                        <p className="text-sm">No hay checklists definidos.</p>
                        <Button variant="link" size="sm" onClick={() => {
                            const newChecklist: ServiceChecklist = {
                                id: crypto.randomUUID(),
                                title: 'Setup Inicial',
                                items: []
                            };
                            handleUpdateChecklists([newChecklist]);
                        }}>
                            Crear primera lista
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {checklists.map((checklist, cIndex) => {
                    const totalItems = checklist.items.length;
                    const completedItems = checklist.items.filter(i => i.completed).length;
                    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                    return (
                        <Card key={checklist.id} className="overflow-hidden border shadow-sm">
                            <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
                                <div className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center border text-xs",
                                    progress === 100 ? "bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" : "bg-background border-muted"
                                )}>
                                    {progress === 100 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="font-mono">{cIndex + 1}</span>}
                                </div>

                                <Input
                                    value={checklist.title}
                                    onChange={(e) => {
                                        const newChecklists = [...checklists];
                                        newChecklists[cIndex] = { ...newChecklists[cIndex], title: e.target.value };
                                        handleUpdateChecklists(newChecklists);
                                    }}
                                    className="h-7 font-semibold bg-transparent border-transparent hover:border-input focus:border-input flex-1 px-1 text-sm shadow-none"
                                />

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                            <Trash className="h-3.5 w-3.5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar esta lista?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Se eliminará "{checklist.title}" y todas sus tareas.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-destructive hover:bg-destructive/90"
                                                onClick={() => {
                                                    const newChecklists = [...checklists];
                                                    newChecklists.splice(cIndex, 1);
                                                    handleUpdateChecklists(newChecklists);
                                                }}
                                            >
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>

                            <CardContent className="p-0">
                                <div className="px-4 pt-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-medium text-muted-foreground">Progreso</span>
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
                                    </div>
                                    <Progress
                                        value={progress}
                                        className="h-1.5 bg-secondary"
                                        indicatorClassName="bg-blue-600 dark:bg-blue-500"
                                    />
                                </div>
                                <div className="p-4 space-y-1.5">
                                    {checklist.items.map((item, iIndex) => (
                                        <div key={item.id} className="flex items-center gap-3 group/item">
                                            <Checkbox
                                                checked={item.completed}
                                                onCheckedChange={(checked) => {
                                                    const newChecklists = [...checklists];
                                                    newChecklists[cIndex] = {
                                                        ...newChecklists[cIndex],
                                                        items: newChecklists[cIndex].items.map((it, idx) =>
                                                            idx === iIndex ? { ...it, completed: !!checked } : it
                                                        )
                                                    };
                                                    handleUpdateChecklists(newChecklists);
                                                }}
                                            />
                                            <Input
                                                value={item.text}
                                                onChange={(e) => {
                                                    const newChecklists = [...checklists];
                                                    newChecklists[cIndex] = {
                                                        ...newChecklists[cIndex],
                                                        items: newChecklists[cIndex].items.map((it, idx) =>
                                                            idx === iIndex ? { ...it, text: e.target.value } : it
                                                        )
                                                    };
                                                    handleUpdateChecklists(newChecklists);
                                                }}
                                                className={cn(
                                                    "h-7 text-sm bg-transparent border-transparent hover:border-input focus:border-input flex-1 shadow-none",
                                                    item.completed && "text-muted-foreground line-through"
                                                )}
                                                placeholder="Nombre de la tarea..."
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                    const newChecklists = [...checklists];
                                                    newChecklists[cIndex] = {
                                                        ...newChecklists[cIndex],
                                                        items: newChecklists[cIndex].items.filter((_, idx) => idx !== iIndex)
                                                    };
                                                    handleUpdateChecklists(newChecklists);
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground hover:text-primary w-full justify-start mt-1"
                                        onClick={() => {
                                            const newChecklists = [...checklists];
                                            newChecklists[cIndex] = {
                                                ...newChecklists[cIndex],
                                                items: [...newChecklists[cIndex].items, {
                                                    id: crypto.randomUUID(),
                                                    text: '',
                                                    completed: false
                                                }]
                                            };
                                            handleUpdateChecklists(newChecklists);
                                        }}
                                    >
                                        <Plus className="mr-2 h-3 w-3" /> Añadir tarea
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
