/**
 * Numia v1.0 - Notification Settings Component
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, Trash2, CheckCheck, Info, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface NotificationPreferences {
  loans: boolean;
  projections: boolean;
  lowBalance: boolean;
}

export function NotificationSettings() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    loans: true,
    projections: true,
    lowBalance: true,
  });
  const [saving, setSaving] = useState(false);

  // Load preferences from Firestore
  // Load preferences from Supabase Auth Metadata
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data } = await supabase.auth.getUser();
        const prefs = data.user?.user_metadata?.preferences?.notifications;

        if (prefs) {
          setPreferences(prefs);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };

    loadPreferences();
  }, [user]);

  const handleSavePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          preferences: {
            notifications: preferences
          }
        }
      });

      if (error) throw error;
      alert('Preferencias guardadas exitosamente');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta notificación?')) {
      await deleteNotification(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notificaciones</h2>
          <p className="text-muted-foreground">Administra tus notificaciones</p>
        </div>
        {notifications.length > 0 && (
          <Button onClick={markAllAsRead} variant="outline" size="sm" className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Todas las Notificaciones
          </CardTitle>
          <CardDescription>
            {notifications.length === 0
              ? 'No tienes notificaciones'
              : `Tienes ${notifications.length} notificación${notifications.length > 1 ? 'es' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay notificaciones en este momento</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${notification.read ? 'bg-background' : 'bg-blue-500/5 border-blue-500/20'
                    }`}
                >
                  <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold mb-1">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.date), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-8 px-2"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferencias de Notificación
          </CardTitle>
          <CardDescription>Configura qué notificaciones deseas recibir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Loans Notifications */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border">
              <Checkbox
                id="loans"
                checked={preferences.loans}
                onCheckedChange={() => togglePreference('loans')}
              />
              <div className="flex-1">
                <Label htmlFor="loans" className="text-sm font-medium cursor-pointer">
                  Notificaciones de Préstamos
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Recibe alertas sobre préstamos próximos a vencer o pagos pendientes
                </p>
              </div>
            </div>

            {/* Projections Notifications */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border">
              <Checkbox
                id="projections"
                checked={preferences.projections}
                onCheckedChange={() => togglePreference('projections')}
              />
              <div className="flex-1">
                <Label htmlFor="projections" className="text-sm font-medium cursor-pointer">
                  Comparación de Proyecciones
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Recibe notificaciones cuando tus gastos reales se desvíen de las proyecciones
                </p>
              </div>
            </div>

            {/* Low Balance Alerts */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border">
              <Checkbox
                id="lowBalance"
                checked={preferences.lowBalance}
                onCheckedChange={() => togglePreference('lowBalance')}
              />
              <div className="flex-1">
                <Label htmlFor="lowBalance" className="text-sm font-medium cursor-pointer">
                  Alertas de Balance Bajo
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Recibe notificaciones cuando el balance de una entidad sea menor a un umbral definido
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Preferencias'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
