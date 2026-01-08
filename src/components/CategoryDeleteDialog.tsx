import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { reassignCategoryMovements } from '@/lib/firebase/database';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import type { Category } from '@/types';

interface CategoryDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    movementCount: number;
    availableCategories: Category[];
    onSuccess: () => void;
}

export function CategoryDeleteDialog({
    open,
    onOpenChange,
    category,
    movementCount,
    availableCategories,
    onSuccess
}: CategoryDeleteDialogProps) {
    const { user } = useAuth();
    const { deleteCategory } = useData();
    const [loading, setLoading] = useState(false);
    const [targetCategoryId, setTargetCategoryId] = useState<string>('');

    const handleDelete = async () => {
        if (!category || !user) return;

        // If has movements and no target selected, show error
        if (movementCount > 0 && !targetCategoryId) {
            alert('Debes seleccionar una categoría destino para los movimientos');
            return;
        }

        setLoading(true);
        try {
            // Reassign movements if needed
            if (movementCount > 0 && targetCategoryId) {
                await reassignCategoryMovements(user.uid, category.id, targetCategoryId);
            }

            // Delete the category
            await deleteCategory(category.id);

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Error al eliminar la categoría');
        } finally {
            setLoading(false);
        }
    };

    if (!category) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Eliminar Categoría
                    </DialogTitle>
                    <DialogDescription>
                        Estás a punto de eliminar la categoría "{category.name}"
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {movementCount > 0 ? (
                        <>
                            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
                                <p className="text-sm text-orange-800 dark:text-orange-200">
                                    Esta categoría tiene <strong>{movementCount} movimiento{movementCount !== 1 ? 's' : ''}</strong> asociado{movementCount !== 1 ? 's' : ''}.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Reasignar movimientos a:</Label>
                                <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCategories
                                            .filter(c => c.id !== category.id && c.type === category.type)
                                            .map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-4 h-4 rounded"
                                                            style={{ backgroundColor: cat.color }}
                                                        />
                                                        {cat.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Los movimientos se reasignarán a esta categoría antes de eliminar
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                Esta categoría no tiene movimientos asociados. Se puede eliminar sin problemas.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading || (movementCount > 0 && !targetCategoryId)}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Eliminar Categoría
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
