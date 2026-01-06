/**
 * Numia v1.0 - Configuration Page
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryManagement } from '@/components/CategoryManagement';
import { AppearanceSettings } from '@/components/configuration/AppearanceSettings';
import { NotificationSettings } from '@/components/configuration/NotificationSettings';
import { Entities } from './Entities';
import { Palette, Bell, Tag, Briefcase } from 'lucide-react';

export function Configuration() {
  return (
    <div className="space-y-6 w-full max-w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra las configuraciones de tu cuenta y la aplicación</p>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apariencia</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Categorías</span>
          </TabsTrigger>
          <TabsTrigger value="entities" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Entidades</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Categorías</h2>
              <p className="text-muted-foreground">Administra las categorías de ingresos y gastos</p>
            </div>
            <CategoryManagement />
          </div>
        </TabsContent>

        <TabsContent value="entities" className="mt-6">
          <Entities hideHeader />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
