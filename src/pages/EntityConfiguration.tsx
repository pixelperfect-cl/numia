import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { GeneralPanel } from '@/components/configuration/GeneralPanel';
import { BoxesPanel } from '@/components/configuration/BoxesPanel';
import { CategoriesPanel } from '@/components/configuration/CategoriesPanel';
import { AdvancedSettings } from '@/components/configuration/AdvancedSettings';




interface EntityConfigurationProps {
    entityId: string;
}

export function EntityConfiguration({ entityId }: EntityConfigurationProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'general';
    const { entities } = useData();
    const [refreshKey, setRefreshKey] = useState(0);

    const entity = entities.find(e => e.id === entityId);

    if (!entity) return <div>Entidad no encontrada.</div>;

    const handleUpdate = () => {
        setRefreshKey(prev => prev + 1);
        window.location.reload(); // Force reload to get fresh data
    };

    const handleTabChange = (value: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', value);
            return newParams;
        });
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración de Entidad</h1>
                <p className="text-muted-foreground">Administra los detalles y configuración de {entity.name}</p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap no-scrollbar h-auto p-1">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="boxes">Cajas</TabsTrigger>
                    <TabsTrigger value="categories">Categorías</TabsTrigger>
                    <TabsTrigger value="advanced">Avanzado</TabsTrigger>

                </TabsList>
                <TabsContent value="general">
                    <GeneralPanel entity={entity} />
                </TabsContent>

                <TabsContent value="boxes">
                    <BoxesPanel entity={entity} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="categories">
                    <CategoriesPanel entityId={entityId} />
                </TabsContent>

                <TabsContent value="advanced">
                    <AdvancedSettings entity={entity} onUpdate={handleUpdate} />
                </TabsContent>




            </Tabs>
        </div>
    );
}
