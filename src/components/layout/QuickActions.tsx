import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, ArrowLeftRight, ArrowRightLeft, Wallet, TrendingUp, Repeat } from 'lucide-react';

export interface QuickActionProps {
    onAction: (action: 'movement' | 'transfer' | 'loan' | 'projection' | 'subscription') => void;
    isMobile?: boolean;
    trigger?: React.ReactNode;
    align?: "center" | "end" | "start";
    side?: "top" | "right" | "bottom" | "left";
}

export function QuickActions({ onAction, isMobile = false, trigger, align = "center", side = "bottom" }: QuickActionProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Wrapper to handle interactions
    const InteractionWrapper = ({ children }: { children: React.ReactNode }) => {
        if (isMobile) return <>{children}</>;

        return (
            <div
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                {children}
            </div>
        );
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <InteractionWrapper>
                <DropdownMenuTrigger asChild>
                    {trigger || (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Crear nuevo"
                            className="bg-secondary/50 hover:bg-secondary data-[state=open]:bg-secondary transition-colors text-header-foreground"
                            onClick={() => { if (isMobile) setIsOpen(!isOpen) }}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align={align}
                    side={side}
                    className="w-56"
                    onCloseAutoFocus={(e) => !isMobile && e.preventDefault()}
                >
                    <DropdownMenuLabel>Crear nuevo</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => onAction('movement')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <ArrowLeftRight className="mr-2 h-4 w-4" /> Movimiento
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onAction('transfer')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferencia
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onAction('loan')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <Wallet className="mr-2 h-4 w-4" /> Préstamo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onAction('projection')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <TrendingUp className="mr-2 h-4 w-4" /> Proyección
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onAction('subscription')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <Repeat className="mr-2 h-4 w-4" /> Suscripción
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </InteractionWrapper>
        </DropdownMenu>
    );
}
