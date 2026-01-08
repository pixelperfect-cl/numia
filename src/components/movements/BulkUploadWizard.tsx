
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save } from 'lucide-react';
import { parseBankStatement, ParsedMovement } from '@/lib/bankParser';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
import type { Movement, MovementType } from '@/types';

interface BulkUploadWizardProps {
    onClose: () => void;
    onSaveSuccess: () => void;
    initialEntityId?: string;
}

export function BulkUploadWizard({ onClose, onSaveSuccess, initialEntityId }: BulkUploadWizardProps) {
    const { entities, createBatchMovements, categories } = useData();
    const [internalEntityId, setInternalEntityId] = useState<string | null>(initialEntityId || null);

    const entity = entities.find(e => e.id === internalEntityId);

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [parsedMovements, setParsedMovements] = useState<ParsedMovement[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [editedMovements, setEditedMovements] = useState<Record<number, Partial<ParsedMovement & { categoryId: string, box: string }>>>({});
    const [selectedDefaultBox, setSelectedDefaultBox] = useState<string>('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Smaller for dialog

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        setIsLoading(true);
        try {
            const movements = await parseBankStatement(file);
            setParsedMovements(movements);
            setSelectedIndices(movements.map((_, i) => i)); // Select all by default
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

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
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
        if (checked) setSelectedIndices(parsedMovements.map((_, i) => i));
        else setSelectedIndices([]);
    };

    const handleSelectRow = (index: number, checked: boolean) => {
        if (checked) setSelectedIndices(prev => [...prev, index]);
        else setSelectedIndices(prev => prev.filter(i => i !== index));
    };

    const handleEditMovement = (index: number, field: string, value: any) => {
        setEditedMovements(prev => ({
            ...prev,
            [index]: { ...prev[index], [field]: value }
        }));
    };

    const availableBoxes = entity ? Object.keys(entity.boxes || {}) : [];

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
            onSaveSuccess();

        } catch (error: any) {
            console.error('Error saving movements:', error);
            alert(error.message || 'Error al guardar los movimientos.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!entity && entities.length > 0) {
        // Entity selection step if not provided
        return (
            <div className="space-y-4 py-4">
                <h3 className="text-lg font-medium">Selecciona una Entidad</h3>
                <div className="grid grid-cols-2 gap-4">
                    {entities.map(ent => (
                        <Button
                            key={ent.id}
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start gap-1"
                            onClick={() => setInternalEntityId(ent.id)}
                        >
                            <span className="font-semibold">{ent.name}</span>
                        </Button>
                    ))}
                </div>
            </div>
        );
    }

    if (!entity) return <div>No hay entidades disponibles. Crea una primero.</div>;

    return (
        <div className="space-y-4">
            {step === 1 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-medium">Entidad:</span>
                        <span className="text-sm text-muted-foreground">{entity.name}</span>
                        <Button variant="link" size="sm" onClick={() => setInternalEntityId(null)} className="h-auto p-0 text-xs">Cambiar</Button>
                    </div>

                    <div
                        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'bg-muted/30 border-muted-foreground/25'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <Upload className={`h-10 w-10 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h3 className="text-base font-semibold mb-1">Cargar Excel</h3>
                        <p className="text-xs text-muted-foreground mb-4 text-center">
                            Arrastra o selecciona tu cartola (BCI Histórica o Detallada)
                        </p>

                        <div className="w-full max-w-[200px] mb-4 space-y-1">
                            <label className="text-xs font-medium">Caja por defecto</label>
                            <Select
                                value={selectedDefaultBox}
                                onValueChange={setSelectedDefaultBox}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableBoxes.map(box => (
                                        <SelectItem key={box} value={box}>{box}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            size="sm"
                            disabled={isLoading || !selectedDefaultBox}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isLoading ? 'Procesando...' : 'Seleccionar Archivo'}
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx"
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {selectedIndices.length} seleccionados
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-8">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
                        </Button>
                    </div>

                    <div className="border rounded-md relative h-[300px] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="w-[30px]">
                                        <Checkbox
                                            checked={parsedMovements.length > 0 && selectedIndices.length === parsedMovements.length}
                                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[110px]">Fecha</TableHead>
                                    <TableHead className="min-w-[180px]">Descripción</TableHead>
                                    <TableHead className="w-[90px]">Monto</TableHead>
                                    <TableHead className="w-[140px]">Categoría</TableHead>
                                    <TableHead className="w-[110px]">Caja</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedMovements
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((mov, i) => {
                                        const index = (currentPage - 1) * itemsPerPage + i;
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
                                                        className="h-8 w-full text-xs"
                                                        onChange={(e) => handleEditMovement(index, 'date', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={edited.description || mov.description}
                                                        className="h-8 w-full text-xs"
                                                        onChange={(e) => handleEditMovement(index, 'description', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className={`text-xs font-medium ${currentType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(mov.amount)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={edited.categoryId || ''}
                                                        onValueChange={(val) => handleEditMovement(index, 'categoryId', val)}
                                                    >
                                                        <SelectTrigger className="h-8 w-full text-xs">
                                                            <SelectValue placeholder="-" />
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
                                                        <SelectTrigger className="h-8 w-full text-xs">
                                                            <SelectValue placeholder="-" />
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

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            Pág {currentPage}/{Math.ceil(parsedMovements.length / itemsPerPage)}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-3 w-3" /></Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-3 w-3" /></Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(Math.ceil(parsedMovements.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(parsedMovements.length / itemsPerPage)}><ChevronRight className="h-3 w-3" /></Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(Math.ceil(parsedMovements.length / itemsPerPage))} disabled={currentPage === Math.ceil(parsedMovements.length / itemsPerPage)}><ChevronsRight className="h-3 w-3" /></Button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} disabled={isLoading || selectedIndices.length === 0}>
                            <Save className="mr-2 h-4 w-4" />
                            Importar {selectedIndices.length} Movimientos
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
