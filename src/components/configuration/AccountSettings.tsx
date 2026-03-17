/**
 * Numia v1.0 - Account Settings Component
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { User as UserIcon, Mail, Globe, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function AccountSettings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [timezone, setTimezone] = useState('America/Santiago');
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      // Fetch timezone from user metadata or table if needed
      // For now default to Santiago or what's in metadata
      // Supabase stores user_metadata in the user object
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar 2MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      let photoURL = user.photoURL;

      // Photo upload
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split('.').pop();
          const fileName = `${user.uid}-${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, photoFile);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
          photoURL = data.publicUrl;

          // Clear file input
          clearPhoto();
        } catch (storageError) {
          console.error("Storage error:", storageError);
          alert("Error al subir la imagen. Verifica tu conexión.");
          // Continue saving other data even if image fails?
        }
      }

      // Update Supabase User
      const updates: any = {
        data: {
          full_name: displayName,
          timezone: timezone,
          // photo_url is sometimes used but standard is usually data.avatar_url or just metadata
          avatar_url: photoURL
        }
      };

      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      alert('Configuración guardada exitosamente');
      // Might need to reload or re-fetch auth user context to see changes immediately if context doesn't auto-update
      window.location.reload();

    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cuenta</h2>
        <p className="text-muted-foreground">Administra la información de tu cuenta</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>Actualiza tu información de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo Upload */}
            <div>
              <Label>Foto de Perfil</Label>
              <div className="mt-2 space-y-2">
                {photoPreview || user.photoURL ? (
                  <div className="relative inline-block">
                    <img
                      src={photoPreview || user.photoURL || ''}
                      alt="Preview"
                      className="h-24 w-24 rounded-full object-cover border-2 border-border"
                    />
                    {photoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-background"
                        onClick={clearPhoto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <label htmlFor="photo" className="inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Cambiar foto</span>
                  </label>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Imagen cuadrada recomendada (max 2MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <Label htmlFor="displayName">Nombre</Label>
              <div className="relative mt-2">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                  placeholder="Tu nombre"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                El correo no puede ser modificado
              </p>
            </div>

            {/* Timezone */}
            <div>
              <Label htmlFor="timezone">Zona Horaria</Label>
              <div className="relative mt-2">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="pl-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Santiago">América/Santiago (CL)</SelectItem>
                    <SelectItem value="America/Buenos_Aires">América/Buenos Aires (AR)</SelectItem>
                    <SelectItem value="America/Lima">América/Lima (PE)</SelectItem>
                    <SelectItem value="America/Bogota">América/Bogotá (CO)</SelectItem>
                    <SelectItem value="America/Mexico_City">América/Ciudad de México (MX)</SelectItem>
                    <SelectItem value="America/New_York">América/Nueva York (US-Este)</SelectItem>
                    <SelectItem value="America/Los_Angeles">América/Los Ángeles (US-Oeste)</SelectItem>
                    <SelectItem value="Europe/Madrid">Europa/Madrid (ES)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas de Cuenta</CardTitle>
            <CardDescription>Información sobre tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-muted-foreground">Proveedor</p>
              <p className="text-lg font-semibold">
                {/* AuthContext abstracts provider, assuming Email or detecting via other means if needed */}
                Email / Google
              </p>
            </div>

            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-muted-foreground">Email verificado</p>
              <p className="text-lg font-semibold">{user.emailVerified ? 'Sí' : 'No'}</p>
            </div>

            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-muted-foreground">Cuenta creada</p>
              <p className="text-lg font-semibold">
                {user.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                  : 'No disponible'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
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
