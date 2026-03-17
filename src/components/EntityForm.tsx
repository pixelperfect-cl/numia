import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { initializeDefaultCategories } from '@/lib/supabase/database';
import { Loader2, Upload } from 'lucide-react';
import type { EntityType } from '@/types';
import { DialogFooter } from '@/components/ui/dialog';
import { uploadEntityLogo } from '@/lib/supabase/storage';

interface EntityFormProps {
    onSuccess: () => void;
}

export function EntityForm({ onSuccess }: EntityFormProps) {
    const { user } = useAuth();
    const { createEntity } = useData();
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'personal' as EntityType,
        color: '#3b82f6',
        logoUrl: '',
        isDefault: false
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Solo se permiten archivos JPG, PNG o WebP');
            return;
        }

        setUploadingLogo(true);
        try {
            // Temporary ID for upload
            const tempId = `temp_${Date.now()}`;
            const downloadURL = await uploadEntityLogo(file, tempId);

            setFormData({ ...formData, logoUrl: downloadURL });
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Error al subir el logo. Por favor intente nuevamente.');
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.name) return;

        setLoading(true);
        console.log('ðŸš€ Starting entity creation...', formData);
        try {
            // Create using DataContext to update global state
            const entityId = await createEntity({
                name: formData.name,
                type: formData.type,
                icon: 'building', // Default icon for backwards compatibility
                color: formData.color,
                logoUrl: formData.logoUrl || undefined,
                boxes: {
                    'Efectivo': { order: 0, isDefault: true, currency: 'CLP' },
                    'Banco': { order: 1, isDefault: false, currency: 'CLP' }
                }
            });

            // Initialize default categories for the new entity
            // Note: In a future refactor, this logic should probably move to the backend or DataContext
            const defaultCategories = [
                { name: 'Sueldo', type: 'income', icon: 'Wallet', color: '#22c55e' },
                { name: 'AlimentaciÃ³n', type: 'expense', icon: 'ShoppingCart', color: '#ef4444' },
                { name: 'Transporte', type: 'expense', icon: 'Car', color: '#f97316' },
                { name: 'Vivienda', type: 'expense', icon: 'Home', color: '#3b82f6' },
                { name: 'Servicios', type: 'expense', icon: 'Zap', color: '#eab308' },
                { name: 'Entretenimiento', type: 'expense', icon: 'Film', color: '#8b5cf6' },
                { name: 'Salud', type: 'expense', icon: 'Heart', color: '#ec4899' },
                { name: 'Otros', type: 'expense', icon: 'MoreHorizontal', color: '#6b7280' }
            ];

            await initializeDefaultCategories(user.uid, defaultCategories);
            console.log('âœ… Entity created successfully, id:', entityId);
            onSuccess();
        } catch (error) {
            console.error('âŒ Error creating entity detailed:', error);
            alert('Error al crear entidad: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
            </div>
            <div>
                <Label>Logo (Opcional - 200x100 px)</Label>
                <div className="mt-2 space-y-2">
                    {formData.logoUrl && (
                        <img
                            src={formData.logoUrl}
                            alt="Logo preview"
                            className="h-[50px] w-[100px] object-contain border rounded"
                        />
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="w-full"
                    >
                        {uploadingLogo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Upload className="mr-2 h-4 w-4" />
                        {formData.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={handleLogoUpload}
                    />
                    <p className="text-xs text-muted-foreground">
                        200x100 pÃ­xeles (JPG, PNG o WebP)
                    </p>
                </div>
            </div>
            <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2 mt-2">
                    {['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#f97316'].map((color) => (
                        <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-primary' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setFormData({ ...formData, color })}
                        />
                    ))}
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Entidad
                </Button>
            </DialogFooter>
        </form>
    );
}

