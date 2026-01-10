/**
 * Numia v1.0 - Settings Page
 */

import { AccountSettings } from '@/components/configuration/AccountSettings';
import { ChangelogPanel } from '@/components/configuration/ChangelogPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/theme-provider';
import { Palette, Info, ChevronRight, Settings as SettingsIcon, Wallet, LayoutGrid, Network } from 'lucide-react';
import { changelog } from '@/data/changelog';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Default to 'general' tab
  const activeTab = searchParams.get('tab') || 'general';

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', value);
      return newParams;
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra las preferencias de tu cuenta</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar flex-nowrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="boxes">Cajas</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="advanced">Avanzado</TabsTrigger>
          <TabsTrigger value="changelog">Versión y Cambios</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Settings */}
            <div className="md:col-span-1">
              <AccountSettings />
            </div>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personaliza el aspecto de la aplicación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="theme">Tema</Label>
                  <div className="relative mt-2">
                    <Palette className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}>
                      <SelectTrigger className="pl-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Oscuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cambia entre modo claro y oscuro
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* System Version Card (Link to Tab) */}
            <Card className="md:col-span-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleTabChange('changelog')}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Info className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Versión del Sistema</h3>
                    <p className="text-sm text-muted-foreground">
                      v{changelog[0]?.version || '0.0.0'} (BETA)
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-2">
                  Ver Detalles
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="boxes">
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Configuración de Cajas</h3>
            <p className="text-muted-foreground mb-4">Gestiona tus cuentas y cajas de efectivo.</p>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Ir al Dashboard</Button>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20">
            <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Categorías</h3>
            <p className="text-muted-foreground">Próximamente: Gestión avanzada de categorías personalizadas.</p>
          </div>
        </TabsContent>

        <TabsContent value="advanced">
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20">
            <Network className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Configuración Avanzada</h3>
            <p className="text-muted-foreground">Opciones técnicas y de conexión.</p>
          </div>
        </TabsContent>

        <TabsContent value="changelog">
          <ChangelogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
