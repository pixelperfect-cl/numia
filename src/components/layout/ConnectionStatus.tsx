import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils'; // Keep this pending until verified if utils exists, usually it does in shadcn projects

interface ConnectionStatusProps {
    onClick?: () => void;
}

export function ConnectionStatus({ onClick }: ConnectionStatusProps) {
    const { status, details } = useConnectionStatus();

    const getStatusColor = () => {
        switch (status) {
            case 'connected':
                return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
            case 'partial':
                return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] warning-pulse';
            case 'disconnected':
                return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
        }
    };

    const getStatusLabel = () => {
        if (status === 'connected') return 'Conexión Estable';
        if (status === 'disconnected') return 'Modo Offline (Sin Internet)';
        return 'Conexión Parcial';
    };

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center justify-center p-2 group",
                            onClick ? "cursor-pointer" : "cursor-help"
                        )}
                        onClick={onClick}
                    >
                        <div
                            className={cn(
                                'h-2.5 w-2.5 rounded-full transition-all duration-500',
                                getStatusColor()
                            )}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs bg-zinc-900 border-zinc-800 text-white p-3 space-y-2">
                    <div className="font-semibold mb-1 border-b border-zinc-700 pb-1">
                        {getStatusLabel()}
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className={cn("h-1.5 w-1.5 rounded-full", details.supabase ? "bg-green-500" : "bg-red-500")} />
                            <span>Supabase Cloud</span>
                        </div>
                    </div>
                    {status === 'disconnected' && (
                        <div className="pt-1 text-[10px] text-zinc-400 italic">
                            Los cambios se guardan localmente.
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider >
    );
}
