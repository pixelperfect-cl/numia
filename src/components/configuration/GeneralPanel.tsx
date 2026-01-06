import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateEntity, deleteEntityCascade } from '@/lib/firebase/database';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import type { Entity } from '@/types';

interface GeneralPanelProps {
    entity: Entity;
}

export function GeneralPanel({ entity }: GeneralPanelProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [formData, setFormData] = useState({
        name: entity.name,
        color: entity.color || '#3b82f6',
        logoUrl: entity.logoUrl || '',
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

        // Validate image dimensions
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            if (img.width !== 200 || img.height !== 100) {
                alert('El logo debe ser exactamente 200x100 píxeles');
                return;
            }

            setUploadingLogo(true);
            try {
                // Get file extension
                const extension = file.name.split('.').pop() || 'png';
                const storageRef = ref(storage, `entities/${entity.id}/logo.${extension}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);

                setFormData({ ...formData, logoUrl: downloadURL });
                await updateEntity(entity.id, { logoUrl: downloadURL });
            } catch (error) {
                console.error('Error uploading logo:', error);
                alert('Error al subir el logo');
            } finally {
                setUploadingLogo(false);
            }
        };
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateEntity(entity.id, {
                name: formData.name,
                color: formData.color,
            });
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
                    <CardTitle>Información Básica</CardTitle>
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
