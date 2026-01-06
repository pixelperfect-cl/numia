import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { GeneralPanel } from '@/components/configuration/GeneralPanel';
import { BoxesPanel } from '@/components/configuration/BoxesPanel';
import { CategoriesPanel } from '@/components/configuration/CategoriesPanel';
import { ModulesPanel } from '@/components/configuration/ModulesPanel';

interface EntityConfigurationProps {
    entityId: string;
}

export function EntityConfiguration({ entityId }: EntityConfigurationProps) {
    const { entities } = useData();
    const [refreshKey, setRefreshKey] = useState(0);

    const entity = entities.find(e => e.id === entityId);

    if (!entity) return <div>Entidad no encontrada.</div>;

    const handleUpdate = () => {
        setRefreshKey(prev => prev + 1);
        window.location.reload(); // Force reload to get fresh data
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración de Entidad</h1>
                <p className="text-muted-foreground">Administra los detalles y configuración de {entity.name}</p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="boxes">Cajas</TabsTrigger>
                    <TabsTrigger value="categories">Categorías</TabsTrigger>
                    <TabsTrigger value="modules">Módulos</TabsTrigger>
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

                <TabsContent value="modules">
                    <ModulesPanel entity={entity} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
