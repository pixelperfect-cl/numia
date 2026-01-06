
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, ArrowLeft, Save, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { parseBankStatement, ParsedMovement } from '@/lib/bankParser';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
import type { Movement, MovementType } from '@/types';

interface MassUploadProps {
    onBack: () => void;
    initialEntityId: string | null;
}

export function MassUpload({ onBack, initialEntityId }: MassUploadProps) {
    const { entities, createBatchMovements, categories } = useData();
    const [internalEntityId, setInternalEntityId] = useState<string | null>(initialEntityId);

    // Sync prop if it changes, though for a page navigation it might only be initial
    useEffect(() => {
        if (initialEntityId) setInternalEntityId(initialEntityId);
    }, [initialEntityId]);

    const entity = entities.find(e => e.id === internalEntityId);

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [parsedMovements, setParsedMovements] = useState<ParsedMovement[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [editedMovements, setEditedMovements] = useState<Record<number, Partial<ParsedMovement & { categoryId: string, box: string }>>>({});
    const [selectedDefaultBox, setSelectedDefaultBox] = useState<string>('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        setIsLoading(true);
        try {
            const movements = await parseBankStatement(file);
            setParsedMovements(movements);
            setSelectedIndices(movements.map((_, i) => i));
            setStep(2);
        } catch (error) {
            console.error('Error parsing file:', error);
            alert('Error al leer el archivo. Verifica que sea un Excel válido (.xlsx) y siga el formato correcto.');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.name.endsWith('.xlsx')) {
                alert('Por favor sube un archivo Excel (.xlsx)');
                return;
            }
            processFile(file);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIndices(parsedMovements.map((_, i) => i));
        } else {
            setSelectedIndices([]);
        }
    };

    const handleSelectRow = (index: number, checked: boolean) => {
        if (checked) {
            setSelectedIndices(prev => [...prev, index]);
        } else {
            setSelectedIndices(prev => prev.filter(i => i !== index));
        }
    };

    const handleEditMovement = (index: number, field: string, value: any) => {
        setEditedMovements(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                [field]: value
            }
        }));
    };

    const availableBoxes = entity ? Object.keys(entity.boxes || {}) : [];
    const defaultBox = availableBoxes.length > 0 ? availableBoxes[0] : '';

    const getAvailableCategories = (type: MovementType) => {
        return categories.filter(c => c.type === type);
    };

    const handleSave = async () => {
        if (!internalEntityId) return;
        setIsLoading(true);

        try {
            const movementsToSave = selectedIndices.map(index => {
                const original = parsedMovements[index];
                const edited = editedMovements[index] || {};

                const description = edited.description || original.description;
                const type = edited.type || original.type;
                const amount = edited.amount !== undefined ? Number(edited.amount) : original.amount;
                const date = edited.date || original.date;
                const categoryId = edited.categoryId || '';
                const box = edited.box || selectedDefaultBox;

                if (!box) throw new Error(`El movimiento "${description}" no tiene caja asignada.`);

                let finalCategoryId = categoryId;
                let finalSubcategory = null;

                if (categoryId.includes(':')) {
                    const parts = categoryId.split(':');
                    finalCategoryId = parts[0];
                    finalSubcategory = parts[1];
                }

                return {
                    entityId: internalEntityId,
                    description,
                    type,
                    amount,
                    date,
                    categoryId: finalCategoryId,
                    subcategory: finalSubcategory || undefined,
                    box
                } as Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
            });

            await createBatchMovements(movementsToSave);
            alert('Movimientos guardados correctamente');
            onBack(); // Go back after success

        } catch (error: any) {
            console.error('Error saving movements:', error);
            alert(error.message || 'Error al guardar los movimientos.');
        } finally {
            setIsLoading(false);
        }
    };

    // If no entity is selected, show entity selector logic (Step 0)
    const showEntitySelector = !entity;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-2xl font-bold tracking-tight">Carga Masiva de Movimientos (v2)</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {showEntitySelector ? 'Seleccionar Entidad' :
                            step === 1 ? 'Importar Archivo' : 'Revisar y Guardar'}
                    </CardTitle>
                    <CardDescription>
                        {showEntitySelector ? 'Selecciona la entidad a la que deseas cargar los movimientos.' :
                            step === 1 ? 'Sube tu cartola bancaria en formato Excel.' : 'Confirma los movimientos que deseas importar.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {showEntitySelector ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {entities.map(ent => (
                                <Button
                                    key={ent.id}
                                    variant="outline"
                                    className="h-auto p-6 flex flex-col items-start gap-2 hover:border-primary transition-all"
                                    onClick={() => setInternalEntityId(ent.id)}
                                >
                                    <span className="font-semibold text-lg">{ent.name}</span>
                                    <span className="text-sm text-muted-foreground capitalize">{ent.type}</span>
                                </Button>
                            ))}
                            {entities.length === 0 && <p className="text-muted-foreground col-span-full">No tienes entidades creadas.</p>}
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div
                                    className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'bg-muted/30 border-muted-foreground/25'
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <Upload className={`h-12 w-12 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <h3 className="text-lg font-semibold mb-2">Sube tu cartola bancaria</h3>
                                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                                        Arrastra tu archivo Excel aquí o haz clic para seleccionarlo.
                                    </p>

                                    <div className="w-full max-w-xs mb-6 space-y-2">
                                        <label className="text-sm font-medium">Caja por defecto</label>
                                        <Select
                                            value={selectedDefaultBox}
                                            onValueChange={setSelectedDefaultBox}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una caja..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableBoxes.map(box => (
                                                    <SelectItem key={box} value={box}>{box}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {availableBoxes.length === 0 && (
                                            <p className="text-xs text-destructive">Esta entidad no tiene cajas creadas. Crea una en Entidades &gt; Cajas.</p>
                                        )}
                                    </div>

                                    <Button
                                        disabled={isLoading || !selectedDefaultBox}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {isLoading ? 'Leyendo...' : 'Seleccionar Archivo'}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".xlsx"
                                        onChange={handleFileUpload}
                                    />
                                    {/* Link to change entity */}
                                    <Button variant="link" className="mt-4 text-xs" onClick={() => setInternalEntityId(null)}>
                                        Cambiar Entidad: {entity.name}
                                    </Button>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            Entidad: <span className="font-medium text-foreground">{entity.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">
                                                {selectedIndices.length} de {parsedMovements.length} seleccionados
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border rounded-md">
                                        {/* Removed ScrollArea to avoid double scrolling with pagination, but kept a fixed height container if needed, or just let it flow */}
                                        <div className="relative min-h-[400px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px]">
                                                            <Checkbox
                                                                checked={parsedMovements.length > 0 && selectedIndices.length === parsedMovements.length}
                                                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                            />
                                                        </TableHead>
                                                        <TableHead className="w-[120px]">Fecha</TableHead>
                                                        <TableHead className="min-w-[200px]">Descripción</TableHead>
                                                        <TableHead className="w-[100px]">Monto</TableHead>
                                                        <TableHead className="w-[150px]">Categoría</TableHead>
                                                        <TableHead className="w-[120px]">Caja</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {parsedMovements
                                                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                        .map((mov, i) => {
                                                            const index = (currentPage - 1) * itemsPerPage + i; // Calculate actual index
                                                            const edited = editedMovements[index] || {};
                                                            const currentType = edited.type || mov.type;
                                                            const isSelected = selectedIndices.includes(index);

                                                            return (
                                                                <TableRow key={index} data-state={isSelected ? "selected" : undefined}>
                                                                    <TableCell>
                                                                        <Checkbox
                                                                            checked={isSelected}
                                                                            onCheckedChange={(checked) => handleSelectRow(index, !!checked)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            type="date"
                                                                            value={edited.date || mov.date}
                                                                            className="h-8 w-full min-w-[110px]"
                                                                            onChange={(e) => handleEditMovement(index, 'date', e.target.value)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            value={edited.description || mov.description}
                                                                            className="h-8 w-full"
                                                                            onChange={(e) => handleEditMovement(index, 'description', e.target.value)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className={`font-medium ${currentType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                                            {formatCurrency(mov.amount)}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Select
                                                                            value={edited.categoryId || ''}
                                                                            onValueChange={(val) => handleEditMovement(index, 'categoryId', val)}
                                                                        >
                                                                            <SelectTrigger className="h-8 w-full min-w-[140px]">
                                                                                <SelectValue placeholder="Categoría" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {getAvailableCategories(currentType).map(cat => (
                                                                                    <React.Fragment key={cat.id}>
                                                                                        <SelectItem value={cat.id}>{cat.name}</SelectItem>
                                                                                        {cat.subcategories?.map(sub => (
                                                                                            <SelectItem key={`${cat.id}:${sub}`} value={`${cat.id}:${sub}`}>
                                                                                                &nbsp;&nbsp;↳ {sub}
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </React.Fragment>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Select
                                                                            value={edited.box || selectedDefaultBox}
                                                                            onValueChange={(val) => handleEditMovement(index, 'box', val)}
                                                                        >
                                                                            <SelectTrigger className="h-8 w-full min-w-[100px]">
                                                                                <SelectValue placeholder="Caja" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {availableBoxes.map(box => (
                                                                                    <SelectItem key={box} value={box}>{box}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="flex items-center justify-between px-2">
                                        <div className="text-sm text-muted-foreground">
                                            Página {currentPage} de {Math.ceil(parsedMovements.length / itemsPerPage)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage(1)}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronsLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(parsedMovements.length / itemsPerPage), p + 1))}
                                                disabled={currentPage === Math.ceil(parsedMovements.length / itemsPerPage)}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage(Math.ceil(parsedMovements.length / itemsPerPage))}
                                                disabled={currentPage === Math.ceil(parsedMovements.length / itemsPerPage)}
                                            >
                                                <ChevronsRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button variant="outline" onClick={() => setStep(1)} disabled={isLoading}>
                                            Atrás
                                        </Button>
                                        <Button onClick={handleSave} disabled={isLoading || selectedIndices.length === 0}>
                                            <Save className="mr-2 h-4 w-4" />
                                            {isLoading ? 'Guardando...' : `Guardar ${selectedIndices.length} Movimientos`}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
