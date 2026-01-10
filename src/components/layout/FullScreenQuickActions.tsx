import { useEffect, useState } from 'react';
import {
    X,
    ArrowLeftRight,
    ArrowRightLeft,
    Wallet,
    TrendingUp,
    Repeat,
    Briefcase,
    Users,
    FolderKanban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface FullScreenQuickActionsProps {
    isOpen: boolean;
    onClose: () => void;
    onAction: (action: 'movement' | 'transfer' | 'loan' | 'projection' | 'subscription' | 'client' | 'service-assign' | 'project') => void;
}

export function FullScreenQuickActions({ isOpen, onClose, onAction }: FullScreenQuickActionsProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            requestAnimationFrame(() => setIsAnimating(true));
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for transition
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    const actions = [
        { id: 'movement', label: 'Nuevo Movimiento', icon: ArrowLeftRight, color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
        { id: 'transfer', label: 'Nueva Transferencia', icon: ArrowRightLeft, color: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20' },
        { id: 'loan', label: 'Nuevo Préstamo', icon: Wallet, color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' },
        { id: 'projection', label: 'Nueva Proyección', icon: TrendingUp, color: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' },
        { id: 'subscription', label: 'Nueva Suscripción', icon: Repeat, color: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20' },
        { id: 'client', label: 'Nuevo Cliente', icon: Users, color: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' },
        { id: 'service-assign', label: 'Asignar Servicio', icon: Briefcase, color: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20' },
        { id: 'project', label: 'Nuevo Proyecto', icon: FolderKanban, color: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' },
    ] as const;

    const handleAction = (actionId: typeof actions[number]['id']) => {
        onAction(actionId);
        onClose();
    };

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md transition-all duration-300",
                isAnimating ? "opacity-100" : "opacity-0"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pt-8 border-b border-border/10">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Acciones Rápidas</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10">
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 animate-in slide-in-from-bottom-8 duration-500 fade-in fill-mode-forwards" style={{ animationDelay: '100ms' }}>
                    {actions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleAction(action.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-6 rounded-2xl border border-border/50 bg-card/50 transition-all active:scale-95 group",
                                action.color
                            )}
                        >
                            <div className="p-3 mb-3 rounded-full bg-background/50 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <action.icon className="h-8 w-8" />
                            </div>
                            <span className="font-medium text-sm text-center text-foreground/90">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 text-center text-muted-foreground text-sm border-t border-border/10">
                Desliza hacia arriba para cerrar
            </div>

            {/* Gesture Area for closing (simple overlay for click, but visually user can just hit X or drag up logic could be added) */}
            {/* For now we rely on the X button and backdrop logic if we made it partial, but it is full screen */}
        </div>
    );
}
