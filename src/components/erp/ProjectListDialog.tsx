import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { createProjectList, updateProjectList } from "@/lib/firebase/database";
import type { ProjectList } from "@/types";
import { Loader2 } from "lucide-react";

interface ProjectListDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    list?: ProjectList; // If provided, we are editing
    onSuccess: () => void;
    currentOrder?: number; // For new lists
}

export function ProjectListDialog({
    open,
    onOpenChange,
    list,
    onSuccess,
    currentOrder = 0
}: ProjectListDialogProps) {
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setTitle(list?.title || "");
        }
    }, [open, list]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title.trim()) return;

        setLoading(true);
        try {
            if (list) {
                // Edit
                await updateProjectList(list.id, { title });
            } else {
                // Create
                await createProjectList(user.uid, {
                    title,
                    order: currentOrder,
                    color: 'bg-slate-500/10 border-slate-500/20' // Default color
                });
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving list:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{list ? 'Editar Flujo' : 'Nuevo Flujo'}</DialogTitle>
                    <DialogDescription>
                        {list ? 'Cambia el nombre del flujo.' : 'Crea un nuevo flujo para organizar tus proyectos.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Nombre
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="col-span-3"
                                placeholder="Ej. Por hacer"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !title.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {list ? 'Guardar Cambios' : 'Crear Flujo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
