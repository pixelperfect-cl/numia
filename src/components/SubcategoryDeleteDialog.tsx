import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { updateCategory as dbUpdateCategory, removeSubcategoryFromMovements, reassignSubcategoryInMovements } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import type { Category } from '@/types';

interface SubcategoryDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    subName: string;
    movementCount: number;
    onSuccess: () => void;
}

export function SubcategoryDeleteDialog({
    open,
    onOpenChange,
    category,
    subName,
    movementCount,
    onSuccess
}: SubcategoryDeleteDialogProps) {
    const { user } = useAuth();
    const { updateCategory } = useData();
    const [loading, setLoading] = useState(false);
    const [targetSubcategory, setTargetSubcategory] = useState<string>('__remove__');

    const handleDelete = async () => {
        if (!category || !user || !subName) return;

        setLoading(true);
        try {
            if (movementCount > 0) {
                if (targetSubcategory === '__remove__') {
                    // Just remove the tag
                    await removeSubcategoryFromMovements(user.uid, category.id, subName);
                } else {
                    // Reassign to another subcategory
                    await reassignSubcategoryInMovements(user.uid, category.id, subName, targetSubcategory);
                }
            }

            // Remove subcategory from the list
            const newSubcategories = category.subcategories?.filter(s => s !== subName) || [];
            await updateCategory(category.id, { subcategories: newSubcategories });

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            alert('Error al eliminar subcategoría');
        } finally {
            setLoading(false);
        }
    };

    if (!category) return null;

    const otherSubcategories = category.subcategories?.filter(s => s !== subName) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Eliminar Subcategoría
                    </DialogTitle>
                    <DialogDescription>
                        Estás a punto de eliminar la subcategoría "{subName}" de "{category.name}"
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {movementCount > 0 ? (
                        <>
                            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
                                <p className="text-sm text-orange-800 dark:text-orange-200">
                                    Esta subcategoría tiene <strong>{movementCount} movimiento{movementCount !== 1 ? 's' : ''}</strong> asociado{movementCount !== 1 ? 's' : ''}.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Acción para los movimientos existentes:</Label>
                                <Select value={targetSubcategory} onValueChange={setTargetSubcategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una acción" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__remove__">
                                            <span className="text-red-600 dark:text-red-400">
                                                Solo quitar etiqueta (quedarán sin subcategoría)
                                            </span>
                                        </SelectItem>
                                        {otherSubcategories.length > 0 && (
                                            <>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                                    Reasignar a:
                                                </div>
                                                {otherSubcategories.map(sub => (
                                                    <SelectItem key={sub} value={sub}>
                                                        {sub}
                                                    </SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    ) : (
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                Esta subcategoría no tiene movimientos. Se eliminará inmediatamente.
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
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

