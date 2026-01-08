/**
 * Numia v1.0 - Appearance Settings Component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/theme-provider';
import { Palette, Sun, Moon, Monitor, Cloud } from 'lucide-react';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Apariencia</h2>
        <p className="text-muted-foreground">Personaliza el aspecto de la aplicación</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>Selecciona el tema de la aplicación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="theme">Modo de Color</Label>
            <div className="relative mt-2">
              <Palette className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
              <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system' | 'cloudy') => setTheme(value)}>
                <SelectTrigger className="pl-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Claro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Oscuro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cloudy">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4" />
                      <span>Nublado</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Sistema</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cambia entre modo claro, oscuro o usa la preferencia de tu sistema
            </p>
          </div>

          {/* Preview Cards */}
          <div className="mt-6 space-y-3">
            <Label>Vista Previa</Label>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary"></div>
                  <div className="space-y-1">
                    <div className="h-3 w-20 bg-primary/20 rounded"></div>
                    <div className="h-2 w-16 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded mb-2"></div>
                <div className="h-2 w-4/5 bg-muted rounded"></div>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted rounded"></div>
                  <div className="h-3 w-5/6 bg-muted rounded"></div>
                  <div className="h-8 w-20 bg-primary/20 rounded mt-3"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
