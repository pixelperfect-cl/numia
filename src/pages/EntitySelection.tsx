import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { IconComponent } from '@/components/IconPicker';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EntityForm } from '@/components/EntityForm';
import numiaLogo from '@/assets/numialogo.png';

interface EntitySelectionProps {
    onSelect: (entityId: string) => void;
}

interface EntityIconProps {
    entity: any;
}

function EntityIcon({ entity }: EntityIconProps) {
    const [imgError, setImgError] = useState(false);

    if (entity.logoUrl && !imgError) {
        return (
            <img
                src={entity.logoUrl}
                alt={entity.name}
                className="h-16 object-contain"
                onError={() => setImgError(true)}
            />
        );
    }

    // Default "dot" style for all entities without a logo
    return (
        <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${entity.color || '#3b82f6'}20` }}
        >
            <div
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: entity.color || '#3b82f6' }}
            />
        </div>
    );
}

export function EntitySelection({ onSelect }: EntitySelectionProps) {
    const { entities, loading, error } = useData();
    const { user } = useAuth();
    const [openCreate, setOpenCreate] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground animate-pulse">Cargando tus entidades...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-4">
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg max-w-md">
                    <p className="font-bold">Error al cargar datos:</p>
                    <p>{error}</p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>
                <p className="text-xs text-muted-foreground">User ID: {user?.uid}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">

            <div className="w-full max-w-4xl space-y-8">
                <div className="text-center space-y-2">
                    <img src={numiaLogo} alt="Numia" className="h-16 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.displayName || 'Usuario'}</h2>
                    <p className="text-muted-foreground text-lg">Selecciona una entidad para comenzar a gestionar</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {entities.map((entity) => (
                        <Card
                            key={entity.id}
                            className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/20 aspect-video flex flex-col justify-center items-center gap-4 group relative overflow-hidden"
                            onClick={() => onSelect(entity.id)}
                        >
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                                style={{ backgroundColor: entity.color || '#3b82f6' }}
                            />

                            <EntityIcon entity={entity} />

                            <div className="text-center z-10">
                                <h3 className="font-bold text-lg">{entity.name}</h3>
                                <p className="text-sm text-muted-foreground capitalize">{entity.type}</p>
                            </div>
                        </Card>
                    ))}

                    {/* Add New Entity Card */}
                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Card className="cursor-pointer hover:shadow-lg transition-all border-2 border-dashed border-muted hover:border-primary/50 aspect-video flex flex-col justify-center items-center gap-2 bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-primary">
                                <div className="p-3 rounded-full bg-background border shadow-sm">
                                    <Plus className="h-6 w-6" />
                                </div>
                                <span className="font-medium">Nueva Entidad</span>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Crear Nueva Entidad</DialogTitle>
                            </DialogHeader>
                            <EntityForm onSuccess={() => setOpenCreate(false)} />
                        </DialogContent>
                    </Dialog>

                </div>
            </div>
        </div>
    );
}
