import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateEntity, deleteEntityCascade } from '@/lib/supabase/database';

import { Loader2, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import type { Entity } from '@/types';

interface GeneralPanelProps {
    entity: Entity;
}

export function GeneralPanel({ entity }: GeneralPanelProps) {
    const { user } = useAuth();
    const { refreshData } = useData();
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [formData, setFormData] = useState({
        name: entity.name,
        color: entity.color || '#3b82f6',
        logoUrl: entity.logoUrl || '',
        rut: entity.rut || '',
        email: entity.email || '',
        phone: entity.phone || '',
        website: entity.website || '',
        address: entity.address || '',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Danger zone state
    const [deleteStep, setDeleteStep] = useState(0);
    const [deleteConfirmText1, setDeleteConfirmText1] = useState('');
    const [deleteConfirmText2, setDeleteConfirmText2] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Solo se permiten archivos JPG, PNG o WebP');
            return;
        }

        // Validate file size (max 500KB for Firestore safety)
        if (file.size > 500 * 1024) {
            alert('El archivo es demasiado grande. Máximo 500KB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const img = new Image();
            img.src = dataUrl;
            img.onload = async () => {
                if (img.width !== 200 || img.height !== 100) {
                    alert('El logo debe ser exactamente 200x100 píxeles');
                    return;
                }

                setUploadingLogo(true);
                try {
                    // Update entity directly with base64 string
                    await updateEntity(entity.id, { logoUrl: dataUrl });
                    await refreshData();
                    setFormData(prev => ({ ...prev, logoUrl: dataUrl }));
                } catch (error) {
                    console.error('Error saving logo:', error);
                    alert('Error al guardar el logo');
                } finally {
                    setUploadingLogo(false);
                }
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateEntity(entity.id, {
                userId: entity.userId,
                name: formData.name,
                color: formData.color,
                rut: formData.rut,
                email: formData.email,
                phone: formData.phone,
                website: formData.website,
                address: formData.address,
            });
            await refreshData();
        } catch (error) {
            console.error('Error saving entity:', error);
        } finally {
            setLoading(false);
        }
    };

    const { movements } = useData();

    const handleDeleteEntity = async () => {
        // Calculate movement count for this entity
        const entityMovements = movements.filter(m => m.entityId === entity.id);
        const hasMovements = entityMovements.length > 0;

        if (deleteStep === 0) {
            setDeleteStep(1);
            return;
        }

        if (deleteStep === 1) {
            // If it has movements, require typing 'eliminar'
            if (hasMovements) {
                if (deleteConfirmText1.toLowerCase() !== 'eliminar') {
                    alert('Debes escribir "eliminar" para continuar');
                    return;
                }
                setDeleteStep(2);
                return;
            } else {
                // If it is empty, skip to step 2 directly (simplified flow)
                // But simplified flow means we skip the typing "eliminar" step.
                // We will treat Step 1 as the final confirmation for empty entities inside the render, 
                // OR we can just jump to step 2 logic here if we reuse the UI.
                // Let's make Step 1 the "Are you sure?" for empty entities.

                // Correction: The UI for Step 1 currently asks for text input.
                // I need to update the UI rendering as well. 
                // Let's handle the step progression here first.

                // If empty, Step 0 -> Step 2 (Final Confirmation Button only)
                setDeleteStep(2);
                return;
            }
        }

        if (deleteStep === 2) {
            // If has movements, require typing 'confirmar eliminación'
            if (hasMovements) {
                if (deleteConfirmText2.toLowerCase() !== 'confirmar eliminación') {
                    alert('Debes escribir "confirmar eliminación" para continuar');
                    return;
                }
            }
            // If empty, no typing required at Step 2, just click.

            if (!user) return;

            setDeleting(true);
            try {
                await deleteEntityCascade(user.uid, entity.id);
                // Redirect to entity selection
                window.location.href = '/';
            } catch (error) {
                console.error('Error deleting entity:', error);
                alert('Error al eliminar la entidad');
                setDeleting(false);
                setDeleteStep(0);
                setDeleteConfirmText1('');
                setDeleteConfirmText2('');
            }
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {formData.logoUrl && <img src={formData.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />}
                        Información Básica
                    </CardTitle>
                    <CardDescription>Detalles generales de la entidad</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre Entidad</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Logo (200x100 px)</Label>
                        <div className="flex gap-4 items-center">
                            {formData.logoUrl && (
                                <img
                                    src={formData.logoUrl}
                                    alt="Logo"
                                    className="h-[50px] w-[100px] object-contain border rounded"
                                />
                            )}
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingLogo}
                                >
                                    {uploadingLogo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Upload className="mr-2 h-4 w-4" />
                                    {formData.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                                </Button>
                                {formData.logoUrl && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={async () => {
                                            setFormData({ ...formData, logoUrl: '' });
                                            await updateEntity(entity.id, { logoUrl: '' });
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                        />
                        <p className="text-xs text-muted-foreground">
                            El logo debe ser exactamente 200x100 píxeles (JPG, PNG o WebP)
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Color (Hex)</Label>
                        <div className="flex gap-2">
                            <div className="w-10 h-10 rounded border" style={{ backgroundColor: formData.color }} />
                            <Input
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="rut">RUT</Label>
                        <Input
                            id="rut"
                            value={formData.rut}
                            onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                            placeholder="12.345.678-9"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contacto@empresa.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+56 9 1234 5678"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="website">Sitio Web</Label>
                        <Input
                            id="website"
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            placeholder="https://www.empresa.com"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Dirección completa"
                        />
                    </div>

                    <Button onClick={handleSave} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-500">Zona de Peligro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Una vez que elimines una entidad, no hay vuelta atrás. Todos los movimientos, préstamos, proyecciones y datos asociados serán eliminados permanentemente.
                    </p>

                    {deleteStep === 0 && (
                        <Button variant="destructive" onClick={handleDeleteEntity}>
                            Eliminar Entidad
                        </Button>
                    )}

                    {deleteStep === 1 && (
                        <div className="space-y-3">
                            <Label>Escribe "eliminar" para continuar:</Label>
                            <Input
                                value={deleteConfirmText1}
                                onChange={(e) => setDeleteConfirmText1(e.target.value)}
                                placeholder="eliminar"
                            />
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { setDeleteStep(0); setDeleteConfirmText1(''); }}>
                                    Cancelar
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteEntity}>
                                    Continuar
                                </Button>
                            </div>
                        </div>
                    )}

                    {deleteStep === 2 && (
                        <div className="space-y-3">
                            {movements.filter(m => m.entityId === entity.id).length > 0 ? (
                                <>
                                    <Label>Escribe "confirmar eliminación" para eliminar permanentemente:</Label>
                                    <Input
                                        value={deleteConfirmText2}
                                        onChange={(e) => setDeleteConfirmText2(e.target.value)}
                                        placeholder="confirmar eliminación"
                                    />
                                </>
                            ) : (
                                <p className="text-sm font-medium text-red-600">
                                    ¿Estás seguro? Esta entidad no tiene movimientos, pero se eliminará su configuración permanentemente.
                                </p>
                            )}

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { setDeleteStep(0); setDeleteConfirmText1(''); setDeleteConfirmText2(''); }} disabled={deleting}>
                                    Cancelar
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteEntity} disabled={deleting}>
                                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {deleting ? 'Eliminando...' : 'Confirmar y Eliminar'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
