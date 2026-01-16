/**
 * Numia v1.0 - Category List Component
 * Paginated list of categories with totals
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';
import type { CategoryBreakdown } from '@/lib/reportUtils';

interface CategoryListProps {
    categories: CategoryBreakdown[];
    colors: string[];
}

export function CategoryList({ categories, colors }: CategoryListProps) {
    const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
    const [currentPage, setCurrentPage] = useState(1);
    const { isBalanceHidden } = usePrivacy();

    if (categories.length === 0) {
        return null;
    }

    const displayCategories = itemsPerPage === 'all'
        ? categories
        : categories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(categories.length / itemsPerPage);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
    };

    const handleItemsPerPageChange = (value: number | 'all') => {
        setItemsPerPage(value);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-3">
            {/* Category List */}
            <div className="space-y-2">
                {displayCategories.map((cat, index) => {
                    // Calculate the actual index in the original array for color matching
                    const originalIndex = categories.findIndex(c => c.categoryId === cat.categoryId);

                    return (
                        <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: cat.color || colors[originalIndex % colors.length] }}
                                />
                                <span className="truncate">{cat.categoryName}</span>
                                <span className="text-muted-foreground text-xs">({cat.percentage.toFixed(1)}%)</span>
                            </div>
                            <span className="font-semibold ml-2">{isBalanceHidden ? '****' : formatCurrency(cat.total)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {categories.length > 10 && (
                <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Mostrar:</span>
                        <div className="flex gap-1">
                            <Button
                                variant={itemsPerPage === 10 ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleItemsPerPageChange(10)}
                                className="h-7 px-2 text-xs"
                            >
                                10
                            </Button>
                            <Button
                                variant={itemsPerPage === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleItemsPerPageChange('all')}
                                className="h-7 px-2 text-xs"
                            >
                                Todos
                            </Button>
                        </div>
                    </div>

                    {itemsPerPage !== 'all' && totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                Página {currentPage} de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
