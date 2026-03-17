import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Eye, EyeOff, Copy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

import { useAuth } from "@/contexts/AuthContext";
import { logProjectActivity } from "@/lib/activityUtils";

export interface Credential {
    id: string;
    title: string;
    username?: string;
    password?: string;
    url?: string;
}

interface CredentialsWidgetProps {
    credentials?: Credential[];
    onUpdate?: (creds: Credential[]) => void;
    projectId?: string;
}

export function CredentialsWidget({ credentials = [], onUpdate, projectId }: CredentialsWidgetProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [url, setUrl] = useState('');

    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    const toggleVisibility = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Show toast ideally
    };

    const handleAddCredential = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        const newCred: Credential = {
            id: crypto.randomUUID(),
            title,
            username,
            password,
            url
        };

        if (onUpdate) {
            onUpdate([...credentials, newCred]);
        }

        if (projectId && user) {
            await logProjectActivity(
                projectId,
                'credential_added',
                `Credencial añadida: ${title}`,
                user.uid,
                user.displayName || 'Usuario'
            );
        }

        setIsOpen(false);
        setTitle('');
        setUsername('');
        setPassword('');
        setUrl('');
    };

    const handleRemoveCredential = async (id: string) => {
        const credToRemove = credentials.find(c => c.id === id);
        if (onUpdate) {
            onUpdate(credentials.filter(c => c.id !== id));
        }

        if (projectId && user && credToRemove) {
            await logProjectActivity(
                projectId,
                'credential_added', // Reusing type or adding credential_removed
                `Credencial eliminada: ${credToRemove.title}`,
                user.uid,
                user.displayName || 'Usuario'
            );
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    Credenciales
                </CardTitle>
                {onUpdate && (
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Añadir Credencial</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddCredential} className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Título</Label>
                                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Acceso WP Admin" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>URL</Label>
                                    <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Usuario</Label>
                                        <Input value={username} onChange={e => setUsername(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contraseña</Label>
                                        <Input value={password} onChange={e => setPassword(e.target.value)} type="text" />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full">Guardar</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {credentials.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4 italic">
                        No hay credenciales guardadas.
                    </div>
                )}

                {credentials.map((cred) => (
                    <div key={cred.id} className="p-3 border rounded-md space-y-2 bg-muted/20 relative group">
                        {onUpdate && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se eliminará la credencial "{cred.title}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive hover:bg-destructive/90"
                                            onClick={() => handleRemoveCredential(cred.id)}
                                        >
                                            Eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}

                        <div className="flex justify-between items-center pr-4">
                            <span className="font-medium text-sm">{cred.title}</span>
                        </div>

                        <div className="grid gap-2">
                            {cred.url && (
                                <a href={cred.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">
                                    {cred.url}
                                </a>
                            )}

                            {cred.username && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground w-16">Usuario</Label>
                                    <div className="flex-1 flex items-center gap-1 bg-background border rounded px-2 py-1 h-7">
                                        <span className="text-xs flex-1 truncate">{cred.username}</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(cred.username!)}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {cred.password && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground w-16">Pass</Label>
                                    <div className="flex-1 flex items-center gap-1 bg-background border rounded px-2 py-1 h-7">
                                        <span className="text-xs flex-1 font-mono truncate">
                                            {visiblePasswords[cred.id] ? cred.password : '••••••••'}
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleVisibility(cred.id)}>
                                            {visiblePasswords[cred.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(cred.password!)}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
