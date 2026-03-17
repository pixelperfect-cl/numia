import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, MoreVertical, Calendar, ArrowLeft, Building2, Users, Upload, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { updateProject } from '@/lib/supabase/database';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { getProjectLists } from '@/lib/supabase/database';
import { uploadProjectLogo } from '@/lib/supabase/storage';
import { toast } from 'sonner';

interface ProjectTopBarProps {
    project: Project;
    clientName: string;
    onUpdate?: (project: Project) => void;
}

export function ProjectTopBar({ project, clientName, onUpdate }: ProjectTopBarProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [statuses, setStatuses] = useState<any[]>([]);
    const [logoUploading, setLogoUploading] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            getProjectLists(user.uid).then(setStatuses);
        }
    }, [user]);

    const handleStatusChange = async (newStatusId: string) => {
        try {
            await updateProject(project.id, { status: newStatusId });
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const url = await uploadProjectLogo(file, project.id);
            await updateProject(project.id, { logoUrl: url });
            if (onUpdate) onUpdate({ ...project, logoUrl: url });
            toast.success('Logo actualizado');
        } catch (err) {
            console.error('Logo upload error:', err);
            toast.error('Error al subir el logo');
        } finally {
            setLogoUploading(false);
        }
    };

    const currentStatus = statuses.find(s => s.id === project.status) || { title: project.status, color: 'bg-slate-500' };

    return (
        <div className="flex flex-col gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 px-6 py-4">
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 -ml-2 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                        onClick={() => navigate('/erp/projects')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div
                                className="relative cursor-pointer group shrink-0"
                                onClick={() => logoInputRef.current?.click()}
                                title="Cambiar logo del proyecto"
                            >
                                {logoUploading ? (
                                    <div className="h-9 w-9 rounded-lg bg-muted border border-border/50 flex items-center justify-center">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : project.logoUrl ? (
                                    <>
                                        <img
                                            src={project.logoUrl}
                                            alt={project.name}
                                            className="h-9 w-9 rounded-lg object-cover border border-border/50"
                                        />
                                        <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="h-3.5 w-3.5 text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center">
                                            <span className="text-sm font-bold text-primary/70">{project.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="h-3.5 w-3.5 text-white" />
                                        </div>
                                    </>
                                )}
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">
                                {project.name}
                            </h1>
                            <StatusDropdown
                                currentStatusId={project.status}
                                statuses={statuses}
                                onChange={handleStatusChange}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer" onClick={() => navigate(`/erp/clients/${project.clientId}`)}>
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{clientName}</span>
                        </div>
                        {project.amount && (
                            <>
                                <span className="text-muted-foreground/30">•</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-foreground">${project.amount.toLocaleString('es-CL')}</span>
                                </div>
                            </>
                        )}
                        {project.progress !== undefined && (
                            <>
                                <span className="text-muted-foreground/30">•</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-12 bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
                                    </div>
                                    <span className="text-xs">{project.progress}%</span>
                                </div>
                            </>
                        )}
                        {project.dueDate && (
                            <>
                                <span className="text-muted-foreground/30">•</span>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{format(parseISO(project.dueDate), "d MMM", { locale: es })}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 mr-4">
                        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                            +
                        </div>
                    </div>

                    <Button variant="outline" size="sm" className="hidden sm:flex">
                        <Users className="mr-2 h-4 w-4" />
                        Equipo
                    </Button>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StatusDropdown({ currentStatusId, statuses, onChange }: { currentStatusId: string, statuses: any[], onChange: (id: string) => void }) {
    const current = statuses.find(s => s.id === currentStatusId) || { title: currentStatusId, color: 'bg-gray-500' };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80",
                    "bg-secondary/50 border border-transparent hover:border-border"
                )}>
                    <div className={cn("w-2 h-2 rounded-full", current.color?.split(' ')[0] || 'bg-slate-500')} />
                    <span>{current.title}</span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
                {statuses.map(status => (
                    <DropdownMenuItem
                        key={status.id}
                        onClick={() => onChange(status.id)}
                        className="flex items-center gap-2"
                    >
                        <div className={cn("w-2 h-2 rounded-full", status.color?.split(' ')[0] || 'bg-slate-500')} />
                        {status.title}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
