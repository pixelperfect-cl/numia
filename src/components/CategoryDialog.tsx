import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import type { Category } from '@/types';

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    onSuccess: () => void;
}

export function CategoryDialog({ open, onOpenChange, category, onSuccess }: CategoryDialogProps) {
    const { updateCategory } = useData();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        color: '#3b82f6',
        subcategories: [] as string[],
    });
    const [newSubcategory, setNewSubcategory] = useState('');

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                color: category.color,
                subcategories: category.subcategories || [],
            });
        } else {
            setFormData({
                name: '',
                color: '#3b82f6',
                subcategories: [],
            });
        }
    }, [category, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category || !formData.name.trim()) return;

        setLoading(true);
        try {
            await updateCategory(category.id, {
                name: formData.name,
                color: formData.color,
                subcategories: formData.subcategories,
            });

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating category:', error);
            alert('Error al actualizar categoría');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubcategory = () => {
        if (!newSubcategory.trim()) return;
        if (formData.subcategories.includes(newSubcategory.trim())) {
            alert('Esta subcategoría ya existe');
            return;
        }

        setFormData({
            ...formData,
            subcategories: [...formData.subcategories, newSubcategory.trim()]
        });
        setNewSubcategory('');
    };

    const handleRemoveSubcategory = (sub: string) => {
        setFormData({
            ...formData,
            subcategories: formData.subcategories.filter(s => s !== sub)
        });
    };

    const predefinedColors = [
        '#ef4444', // red
        '#f97316', // orange
        '#f59e0b', // amber
        '#eab308', // yellow
        '#84cc16', // lime
        '#22c55e', // green
        '#10b981', // emerald
        '#14b8a6', // teal
        '#06b6d4', // cyan
        '#0ea5e9', // sky
        '#3b82f6', // blue
        '#6366f1', // indigo
        '#8b5cf6', // violet
        '#a855f7', // purple
        '#d946ef', // fuchsia
        '#ec4899', // pink
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Categoría</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="categoryName">Nombre de la Categoría *</Label>
                        <Input
                            id="categoryName"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Color</Label>
                        <div className="flex gap-2 items-center mb-2">
                            <div
                                className="w-12 h-12 rounded border-2"
                                style={{ backgroundColor: formData.color }}
                            />
                            <Input
                                type="text"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                placeholder="#3b82f6"
                                className="flex-1"
                            />
                        </div>
                        <div className="grid grid-cols-8 gap-2">
                            {predefinedColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${formData.color === color ? 'border-primary ring-2 ring-primary' : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Subcategorías</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nueva subcategoría..."
                                value={newSubcategory}
                                onChange={(e) => setNewSubcategory(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSubcategory();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddSubcategory} variant="secondary">
                                +
                            </Button>
                        </div>

                        {formData.subcategories.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto p-1">
                                {formData.subcategories.map((sub, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm border"
                                    >
                                        <span>{sub}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSubcategory(sub)}
                                            className="text-muted-foreground hover:text-red-500 ml-1"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                                No hay subcategorías. Agrega una arriba.
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
