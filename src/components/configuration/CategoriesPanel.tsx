import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
// getCategoryMovementCount removed as we calculate locally
import { Edit, Trash2, Search } from 'lucide-react';
import { CategoryDialog } from '@/components/CategoryDialog';
import { CategoryDeleteDialog } from '@/components/CategoryDeleteDialog';
import { SubcategoryDeleteDialog } from '@/components/SubcategoryDeleteDialog';
import { Input } from '@/components/ui/input';
import type { Category } from '@/types';

interface CategoriesPanelProps {
    entityId: string;
}

export function CategoriesPanel({ entityId }: CategoriesPanelProps) {
    const { user } = useAuth();
    const { categories, updateCategory, movements, loading: dataLoading } = useData();
    // Removed local loading state for counts, relying on dataLoading from context if needed, 
    // but honestly for categories we usually have them cached or fast.

    // Calculate counts locally
    const movementCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        movements.forEach(m => {
            if (m.categoryId) {
                counts[m.categoryId] = (counts[m.categoryId] || 0) + 1;
            }
        });
        return counts;
    }, [movements]);

    // Subcategory Management State
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // State for subcategory deletion dialog
    const [subToDelete, setSubToDelete] = useState<{ category: Category; name: string } | null>(null);

    // Subcategory movement count helper
    const getSubcategoryMovementCount = (categoryId: string, subName: string) => {
        return movements.filter(m =>
            m.categoryId === categoryId &&
            m.subcategory === subName
        ).length;
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setEditDialogOpen(true);
    };

    const handleDelete = (category: Category) => {
        setDeletingCategory(category);
        setDeleteDialogOpen(true);
    };

    const handleRenameSubcategory = async (category: Category, oldName: string) => {
        const newName = prompt('Nuevo nombre para la subcategoría:', oldName);
        if (!newName || newName === oldName) return;

        try {
            // 1. Update movements
            await import('@/lib/firebase/database').then(mod =>
                mod.renameSubcategoryInMovements(user!.uid, category.id, oldName, newName)
            );

            // 2. Update category list
            const newSubcategories = category.subcategories?.map(s => s === oldName ? newName : s) || [];
            await updateCategory(category.id, { subcategories: newSubcategories });

        } catch (error) {
            console.error('Error renaming subcategory:', error);
            alert('Error al renombrar subcategoría');
        }
    };

    const handleDeleteSubcategory = (category: Category, subName: string) => {
        setSubToDelete({ category, name: subName });
    };

    const handleEditSuccess = () => {
        setEditDialogOpen(false);
    };

    const handleDeleteSuccess = () => {
        setDeleteDialogOpen(false);
    };

    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    const filterCategories = (cats: Category[]) => {
        if (!searchTerm) return cats;
        return cats.filter(cat =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cat.subcategories?.some(sub => sub.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const renderCategoryList = (cats: Category[]) => {
        const filtered = filterCategories(cats);

        if (filtered.length === 0) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    No se encontraron categorías
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {filtered.map(category => (
                    <div key={category.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-md cursor-pointer hover:ring-2 hover:ring-primary transition-all flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: category.color }}
                                    onClick={() => handleEdit(category)}
                                    title="Click para editar color"
                                >
                                    {category.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-semibold text-lg">{category.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {movementCounts[category.id] || 0} movimientos total
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(category)}
                                    title="Editar Categoría"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(category)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    title="Eliminar Categoría"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Subcategories Branch */}
                        {category.subcategories && category.subcategories.length > 0 && (
                            <div className="border-t bg-muted/20 pb-2">
                                <div className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-12 flex items-center gap-2">
                                    <span className="h-px bg-border flex-1"></span>
                                    Subcategorías
                                    <span className="h-px bg-border flex-1"></span>
                                </div>
                                <div className="space-y-1 pl-12 pr-3">
                                    {category.subcategories.map(sub => (
                                        <div key={sub} className="group flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-background hover:shadow-sm transition-all text-sm border border-transparent hover:border-border">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-colors"></div>
                                                <span className="font-medium">{sub}</span>
                                            </div>
                                            <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="text-xs text-muted-foreground bg-muted group-hover:bg-muted/50 px-2 py-0.5 rounded-full">
                                                    {getSubcategoryMovementCount(category.id, sub)} movs
                                                </span>
                                                <div className="flex items-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleRenameSubcategory(category, sub)}
                                                        title="Renombrar Subcategoría"
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-red-500 hover:text-red-700"
                                                        onClick={() => handleDeleteSubcategory(category, sub)}
                                                        title="Eliminar Subcategoría"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Categorías</CardTitle>
                    <CardDescription>
                        Administra las categorías de ingresos y gastos. Puedes ver cuántos movimientos tiene cada una.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar categorías..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <Tabs defaultValue="income">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="income">Ingresos</TabsTrigger>
                            <TabsTrigger value="expense">Gastos</TabsTrigger>
                        </TabsList>
                        <TabsContent value="income" className="space-y-4 mt-4">
                            {dataLoading ? (
                                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                            ) : incomeCategories.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No hay categorías de ingresos
                                </div>
                            ) : (
                                renderCategoryList(incomeCategories)
                            )}
                        </TabsContent>
                        <TabsContent value="expense" className="space-y-4 mt-4">
                            {dataLoading ? (
                                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                            ) : expenseCategories.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No hay categorías de gastos
                                </div>
                            ) : (
                                renderCategoryList(expenseCategories)
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <CategoryDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                category={editingCategory}
                onSuccess={handleEditSuccess}
            />

            <CategoryDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                category={deletingCategory}
                movementCount={deletingCategory ? (movementCounts[deletingCategory.id] || 0) : 0}
                availableCategories={categories}
                onSuccess={handleDeleteSuccess}
            />

            <SubcategoryDeleteDialog
                open={!!subToDelete}
                onOpenChange={(open) => !open && setSubToDelete(null)}
                category={subToDelete?.category || null}
                subName={subToDelete?.name || ''}
                movementCount={subToDelete ? getSubcategoryMovementCount(subToDelete.category.id, subToDelete.name) : 0}
                onSuccess={() => {
                    setSubToDelete(null);
                    // DataContext updates UI automatically
                }}
            />
        </div>
    );
}
