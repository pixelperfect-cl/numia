import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { cn } from '@/lib/utils';
import { Database, Cloud, Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatusDetail() {
    const { status, details } = useConnectionStatus();

    const getStatusColor = () => {
        switch (status) {
            case 'connected':
                return 'text-green-500';
            case 'partial':
                return 'text-orange-500';
            case 'disconnected':
                return 'text-red-500';
        }
    };

    const getStatusLabel = () => {
        if (status === 'connected') return 'Conexión Estable';
        if (status === 'disconnected') return 'Modo Offline (Sin Internet)';
        return 'Conexión Parcial';
    };

    const getStatusIcon = () => {
        if (status === 'connected') return <Wifi className="h-5 w-5" />;
        if (status === 'disconnected') return <WifiOff className="h-5 w-5" />;
        return <Wifi className="h-5 w-5" />;
    };

    return (
        <div className="space-y-4 py-2">
            {/* Overall Status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className={cn("flex items-center justify-center", getStatusColor())}>
                    {getStatusIcon()}
                </div>
                <div className="flex-1">
                    <div className={cn("font-semibold", getStatusColor())}>
                        {getStatusLabel()}
                    </div>
                    {status === 'disconnected' && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Los cambios se guardan localmente y se sincronizarán cuando vuelva la conexión.
                        </p>
                    )}
                </div>
            </div>

            {/* Database Status Details */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Estado de Bases de Datos</h4>

                {/* Firebase */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                        <div className="font-medium text-sm">Firebase</div>
                        <div className="text-xs text-muted-foreground">Base de datos principal</div>
                    </div>
                    <div className={cn(
                        "h-3 w-3 rounded-full",
                        details.firebase ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                    )} />
                </div>

                {/* Supabase */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                        <div className="font-medium text-sm">Supabase</div>
                        <div className="text-xs text-muted-foreground">Base de datos de respaldo</div>
                    </div>
                    <div className={cn(
                        "h-3 w-3 rounded-full",
                        details.supabase ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                    )} />
                </div>
            </div>
        </div>
    );
}
