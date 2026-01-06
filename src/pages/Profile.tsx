/**
 * Numia v1.0 - Profile Page
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Calendar } from 'lucide-react';

export function Profile() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Información de tu cuenta</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo */}
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-20 w-20 rounded-full"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{user.displayName || 'Usuario'}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-sm font-medium">{user.displayName || 'No configurado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Correo</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Cuenta creada</p>
                  <p className="text-sm font-medium">
                    {user.metadata?.creationTime
                      ? new Date(user.metadata.creationTime).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'No disponible'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas de Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-muted-foreground">Proveedor de autenticación</p>
              <p className="text-lg font-semibold">
                {user.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-muted-foreground">Email verificado</p>
              <p className="text-lg font-semibold">{user.emailVerified ? 'Sí' : 'No'}</p>
            </div>

            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-muted-foreground">Último acceso</p>
              <p className="text-lg font-semibold">
                {user.metadata?.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'No disponible'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
