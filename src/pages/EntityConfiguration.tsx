import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { GeneralPanel } from '@/components/configuration/GeneralPanel';
import { BoxesPanel } from '@/components/configuration/BoxesPanel';
import { CategoriesPanel } from '@/components/configuration/CategoriesPanel';
import { AdvancedSettings } from '@/components/configuration/AdvancedSettings';
import { NotificationSettings } from '@/components/configuration/NotificationSettings';
import { EmailTemplatesPanel } from '@/components/configuration/EmailTemplatesPanel';
import { ChangelogPanel } from '@/components/configuration/ChangelogPanel';

interface EntityConfigurationProps {
    entityId: string;
}

export function EntityConfiguration({ entityId }: EntityConfigurationProps) {
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'general';
    const { entities } = useData();
    const [refreshKey, setRefreshKey] = useState(0);

    const entity = entities.find(e => e.id === entityId);

    if (!entity) return <div>Entidad no encontrada.</div>;

    const handleUpdate = () => {
        setRefreshKey(prev => prev + 1);
        window.location.reload();
    };

    const sectionTitles: Record<string, string> = {
        general: 'General',
        boxes: 'Cajas',
        categories: 'Categorías',
        notifications: 'Notificaciones',
        advanced: 'Avanzado',
        changelog: 'Versión y Cambios',
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración de Entidad</h1>
                <p className="text-muted-foreground">
                    {entity.name} — {sectionTitles[activeTab] || 'General'}
                </p>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'general' && <GeneralPanel entity={entity} />}
                {activeTab === 'boxes' && <BoxesPanel entity={entity} onUpdate={handleUpdate} />}
                {activeTab === 'categories' && <CategoriesPanel entityId={entityId} />}
                {activeTab === 'notifications' && <NotificationSettings entity={entity} />}
                {activeTab === 'advanced' && <AdvancedSettings entity={entity} onUpdate={handleUpdate} />}
                {activeTab === 'changelog' && <ChangelogPanel />}
            </div>
        </div>
    );
}
