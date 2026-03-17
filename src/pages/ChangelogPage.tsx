import { ChangelogPanel } from '@/components/configuration/ChangelogPanel';

export function ChangelogPage() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto py-6 px-4 md:px-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Historial de Cambios</h1>
                <p className="text-muted-foreground">Versiones y actualizaciones del sistema</p>
            </div>
            <ChangelogPanel />
        </div>
    );
}
