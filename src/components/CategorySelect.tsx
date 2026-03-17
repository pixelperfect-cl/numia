
import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import type { Category } from '@/types';
import { CategoryDialog } from '@/components/CategoryDialog';

interface CategorySelectProps {
    value: string;
    onValueChange: (value: string) => void;
    categories: Category[];
    type: 'income' | 'expense';
    placeholder?: string;
    disabled?: boolean;
    onCategoryCreated?: () => void;
}

export function CategorySelect({
    value,
    onValueChange,
    categories,
    type,
    placeholder = "Selecciona una categoría",
    disabled = false,
    onCategoryCreated
}: CategorySelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

    const filteredCategories = useMemo(() => {
        // Filter by type
        const typeCategories = categories.filter(c => c.type === type);

        // Filter by search term
        if (!search) return typeCategories;

        return typeCategories.filter(category => {
            const matchName = category.name.toLowerCase().includes(search.toLowerCase());
            const matchSub = category.subcategories?.some(sub =>
                sub.toLowerCase().includes(search.toLowerCase())
            );
            return matchName || matchSub;
        });
    }, [categories, type, search]);

    const selectedCategoryLabel = useMemo(() => {
        if (!value) return placeholder;

        // Check if value includes subcategory (format: "categoryId:subcategory")
        const [categoryId, subcategory] = value.includes(':')
            ? value.split(':')
            : [value, undefined];

        const category = categories.find(c => c.id === categoryId);
        if (!category) return placeholder;

        if (subcategory) {
            return `${category.name} › ${subcategory}`;
        }
        return category.name;
    }, [value, categories, placeholder]);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between font-normal"
                        disabled={disabled}
                    >
                        <span className="truncate">{selectedCategoryLabel}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar categoría..."
                                className="pl-8 h-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredCategories.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No se encontraron categorías.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredCategories.map((category) => (
                                    <React.Fragment key={category.id}>
                                        {/* Main Category */}
                                        <div
                                            className={cn(
                                                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                                value === category.id && "bg-accent text-accent-foreground"
                                            )}
                                            onClick={() => {
                                                onValueChange(category.id);
                                                setOpen(false);
                                                setSearch("");
                                            }}
                                        >
                                            <div
                                                className="mr-2 h-2 w-2 rounded-full"
                                                style={{ backgroundColor: category.color || '#ccc' }}
                                            />
                                            <span className="flex-1 font-medium">{category.name}</span>
                                            {value === category.id && (
                                                <Check className="ml-auto h-4 w-4" />
                                            )}
                                        </div>

                                        {/* Subcategories */}
                                        {category.subcategories?.map((sub) => {
                                            const subValue = `${category.id}:${sub}`;
                                            const isSelected = value === subValue;

                                            // Check if subcategory matches search (or parent matches)
                                            const matchesSearch = !search ||
                                                category.name.toLowerCase().includes(search.toLowerCase()) ||
                                                sub.toLowerCase().includes(search.toLowerCase());

                                            if (!matchesSearch) return null;

                                            return (
                                                <div
                                                    key={subValue}
                                                    className={cn(
                                                        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                                        isSelected && "bg-accent text-accent-foreground"
                                                    )}
                                                    onClick={() => {
                                                        onValueChange(subValue);
                                                        setOpen(false);
                                                        setSearch("");
                                                    }}
                                                >
                                                    <span className="flex-1 text-muted-foreground">↳ {sub}</span>
                                                    {isSelected && (
                                                        <Check className="ml-auto h-4 w-4" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create Category Button */}
                    <div className="border-t mt-1 pt-1">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-sm font-normal"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCategoryDialogOpen(true);
                            }}
                        >
                            <span className="mr-2">+</span>
                            Crear nueva categoría
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <CategoryDialog
                open={categoryDialogOpen}
                onOpenChange={setCategoryDialogOpen}
                category={null}
                defaultType={type}
                onSuccess={() => {
                    setCategoryDialogOpen(false);
                    onCategoryCreated?.();
                }}
            />
        </>
    );
}
