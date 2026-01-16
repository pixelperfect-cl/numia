import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Plus, X, Phone, MessageCircle, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { logProjectActivity } from "@/lib/activityUtils";

interface TeamMember {
    name: string;
    role: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    img?: string;
}

interface TeamWidgetProps {
    team?: TeamMember[];
    onUpdate?: (newTeam: TeamMember[]) => void;
    projectId?: string;
}

export function TeamWidget({ team = [], onUpdate, projectId }: TeamWidgetProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');



    const resetForm = () => {
        setName('');
        setRole('');
        setEmail('');
        setPhone('');
        setWhatsapp('');
        setEditingIndex(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            resetForm();
        }
    };

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !role) return;

        const newMember: TeamMember = { name, role, email, phone, whatsapp };
        let updatedTeam = [...team];
        let action: 'added' | 'updated' = 'added';

        if (editingIndex !== null) {
            // Edit existing
            updatedTeam[editingIndex] = newMember;
            action = 'updated';
        } else {
            // Add new
            updatedTeam = [...team, newMember];
        }

        if (onUpdate) {
            onUpdate(updatedTeam);
        }

        if (projectId && user) {
            await logProjectActivity(
                projectId,
                'member_added', // Reusing this type for updates as well or we can add member_updated
                action === 'added'
                    ? `Miembro añadido: ${newMember.name} (${newMember.role})`
                    : `Miembro actualizado: ${newMember.name}`,
                user.uid,
                user.displayName || 'Usuario'
            );
        }

        setIsOpen(false);
        resetForm();
    };

    const startEdit = (index: number) => {
        const member = team[index];
        setName(member.name);
        setRole(member.role);
        setEmail(member.email || '');
        setPhone(member.phone || '');
        setWhatsapp(member.whatsapp || '');
        setEditingIndex(index);
        setIsOpen(true);
    };

    const handleRemoveMember = async (index: number) => {
        const memberToRemove = team[index];
        const updatedTeam = team.filter((_, i) => i !== index);

        if (onUpdate) {
            onUpdate(updatedTeam);
        }

        if (projectId && user && memberToRemove) {
            await logProjectActivity(
                projectId,
                'member_added', // Using member_added as a generic 'member change' or could add 'member_removed' type
                `Miembro eliminado: ${memberToRemove.name}`,
                user.uid,
                user.displayName || 'Usuario'
            );
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Equipo
                </CardTitle>
                {onUpdate && (
                    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingIndex !== null ? 'Editar Miembro' : 'Añadir Miembro'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSaveMember} className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Ana García" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rol</Label>
                                    <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Ej. Frontend Developer" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email (Opcional)</Label>
                                    <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="ana@empresa.com" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Teléfono</Label>
                                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+56 9..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>WhatsApp</Label>
                                        <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+56 9..." />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full">
                                    {editingIndex !== null ? 'Guardar Cambios' : 'Añadir'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {team.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                        Sin miembros asignados.
                    </p>
                )}

                <div className="grid gap-3">
                    {team.map((member, i) => (
                        <div key={i} className="flex items-start justify-between group pt-2 first:pt-0 border-t first:border-t-0 pb-2 last:pb-0">
                            <div className="flex items-start gap-3 w-full">
                                <Avatar className="h-9 w-9 border mt-0.5">
                                    <AvatarImage src={member.img} />
                                    <AvatarFallback className="text-xs">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="leading-tight w-full">
                                    <p className="text-sm font-medium">{member.name}</p>
                                    <p className="text-xs text-muted-foreground mb-1">{member.role}</p>

                                    {/* Contact Details Grid */}
                                    <div className="grid gap-1 mt-2">
                                        {member.email && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Mail className="h-3 w-3 shrink-0" />
                                                <a href={`mailto:${member.email}`} className="truncate hover:text-primary">{member.email}</a>
                                            </div>
                                        )}
                                        {member.phone && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Phone className="h-3 w-3 shrink-0" />
                                                <a href={`tel:${member.phone}`} className="truncate hover:text-primary">{member.phone}</a>
                                            </div>
                                        )}
                                        {member.whatsapp && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <MessageCircle className="h-3 w-3 shrink-0" />
                                                <a
                                                    href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="truncate hover:text-primary"
                                                >
                                                    {member.whatsapp}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {onUpdate && (
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity self-start mt-0.5 ml-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                                        onClick={() => startEdit(i)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    ¿Estás seguro de que quieres eliminar a <b>{member.name}</b> del equipo? Esta acción no se puede deshacer.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive hover:bg-destructive/90"
                                                    onClick={() => handleRemoveMember(i)}
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
