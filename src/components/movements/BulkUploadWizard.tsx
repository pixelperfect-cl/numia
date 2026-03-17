
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, ChevronLeft, ChevronRight, Save, AlertTriangle, CheckCircle2, SkipForward } from 'lucide-react';
import { parseBankStatement, ParsedMovement, BankProvider } from '@/lib/bankParser';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
import type { Movement, MovementType } from '@/types';
import { CategorySelect } from '@/components/CategorySelect';
import { Badge } from '@/components/ui/badge';

interface BulkUploadWizardProps {
    onClose: () => void;
    onSaveSuccess: () => void;
    initialEntityId: string;
}

export function BulkUploadWizard({ onClose, onSaveSuccess, initialEntityId }: BulkUploadWizardProps) {
    const { entities, createBatchMovements, getExistingBankTransactionIds, categories } = useData();
    const [internalEntityId] = useState<string>(initialEntityId);

    const entity = entities.find(e => e.id === internalEntityId);

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [parsedMovements, setParsedMovements] = useState<ParsedMovement[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [editedMovements, setEditedMovements] = useState<Record<number, Partial<ParsedMovement & { categoryId: string, box: string }>>>({});
    const [selectedDefaultBox, setSelectedDefaultBox] = useState<string>('');
    const [selectedDefaultExpenseCategory, setSelectedDefaultExpenseCategory] = useState<string>('');
    const [selectedDefaultIncomeCategory, setSelectedDefaultIncomeCategory] = useState<string>('');
    const [selectedBank, setSelectedBank] = useState<BankProvider>('bci');

    // Deduplication state
    const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
    const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        setIsLoading(true);
        try {
            const movements = await parseBankStatement(file, selectedBank);
            setParsedMovements(movements);

            // Check for duplicates
            if (internalEntityId) {
                try {
                    const existingIds = await getExistingBankTransactionIds(internalEntityId);
                    const dupes = new Set<number>();
                    movements.forEach((m, i) => {
                        if (m.bankTransactionId && existingIds.has(m.bankTransactionId)) {
                            dupes.add(i);
                        }
                    });
                    setDuplicateIndices(dupes);

                    // Select all non-duplicate by default
                    const nonDuplicateIndices = movements
                        .map((_, i) => i)
                        .filter(i => !dupes.has(i));
                    setSelectedIndices(nonDuplicateIndices);
                } catch (err) {
                    console.warn('Could not check for duplicates:', err);
                    setSelectedIndices(movements.map((_, i) => i));
                }
            } else {
                setSelectedIndices(movements.map((_, i) => i));
            }

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
        if (checked) {
            // Select all non-duplicate
            const nonDupes = parsedMovements
                .map((_, i) => i)
                .filter(i => !duplicateIndices.has(i));
            setSelectedIndices(prev => [...new Set([...prev, ...nonDupes])]);
        } else {
            setSelectedIndices([]);
        }
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

    const getEffectiveCategory = (index: number, type: MovementType) => {
        const edited = editedMovements[index] || {};
        if (edited.categoryId) return edited.categoryId;
        if (type === 'expense' && selectedDefaultExpenseCategory) return selectedDefaultExpenseCategory;
        if (type === 'income' && selectedDefaultIncomeCategory) return selectedDefaultIncomeCategory;
        return '';
    };

    // Stats
    const stats = useMemo(() => {
        const selectedNonDupes = selectedIndices.filter(i => !duplicateIndices.has(i));
        const selectedDupes = selectedIndices.filter(i => duplicateIndices.has(i));
        return {
            total: parsedMovements.length,
            duplicates: duplicateIndices.size,
            selectedNew: selectedNonDupes.length,
            selectedDupes: selectedDupes.length,
            selected: selectedIndices.length,
        };
    }, [parsedMovements, selectedIndices, duplicateIndices]);

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
                const box = edited.box || selectedDefaultBox;
                const bankTransactionId = original.bankTransactionId || undefined;

                const categoryId = getEffectiveCategory(index, type);

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
                    box,
                    bankTransactionId,
                } as Omit<Movement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
            });

            const result = await createBatchMovements(movementsToSave);
            setImportResult(result);

            // If everything was inserted (no issues), auto-navigate after brief delay
            if (result.skipped === 0) {
                setTimeout(() => onSaveSuccess(), 1500);
            }

        } catch (error: any) {
            console.error('Error saving movements:', error);
            alert(error.message || 'Error al guardar los movimientos.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!entity) return <div>No se encontró la entidad activa.</div>;

    // Bank options for the selector
    const bankOptions = [
        { value: 'bci' as BankProvider, label: 'BCI', enabled: true },
        { value: 'santander' as BankProvider, label: 'Santander', enabled: false },
        { value: 'bice' as BankProvider, label: 'BICE', enabled: false },
    ];

    return (
        <div className="space-y-4 h-full flex flex-col">
            {step === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-2xl space-y-8">
                        <div className="space-y-2 text-center">
                            <h3 className="text-2xl font-bold tracking-tight">Carga de Datos</h3>
                            <p className="text-muted-foreground">
                                Sube tu archivo Excel para importar movimientos a <span className="font-semibold text-foreground">{entity.name}</span>.
                            </p>
                        </div>

                        {/* Configuration Card */}
                        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Configuración Base</h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Bank Selector */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">Banco</label>
                                    <Select
                                        value={selectedBank}
                                        onValueChange={(v) => setSelectedBank(v as BankProvider)}
                                    >
                                        <SelectTrigger className="w-full bg-background">
                                            <SelectValue placeholder="Seleccionar banco..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankOptions.map(bank => (
                                                <SelectItem
                                                    key={bank.value}
                                                    value={bank.value}
                                                    disabled={!bank.enabled}
                                                >
                                                    {bank.label} {!bank.enabled && '(próximamente)'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">El sistema detectará automáticamente transacciones duplicadas.</p>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">Caja Predeterminada</label>
                                    <Select
                                        value={selectedDefaultBox}
                                        onValueChange={setSelectedDefaultBox}
                                    >
                                        <SelectTrigger className="w-full bg-background">
                                            <SelectValue placeholder="Seleccionar caja..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableBoxes.map(box => (
                                                <SelectItem key={box} value={box}>{box}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">Requerido para todos los movimientos.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                        Categoría Gastos
                                    </label>
                                    <CategorySelect
                                        value={selectedDefaultExpenseCategory}
                                        onValueChange={setSelectedDefaultExpenseCategory}
                                        categories={categories}
                                        type="expense"
                                        placeholder="Opcional..."
                                    />
                                    <p className="text-[10px] text-muted-foreground">Para movimientos de tipo Gasto.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Categoría Ingresos
                                    </label>
                                    <CategorySelect
                                        value={selectedDefaultIncomeCategory}
                                        onValueChange={setSelectedDefaultIncomeCategory}
                                        categories={categories}
                                        type="income"
                                        placeholder="Opcional..."
                                    />
                                    <p className="text-[10px] text-muted-foreground">Para movimientos de tipo Ingreso.</p>
                                </div>
                            </div>
                        </div>

                        {/* Upload Dropzone */}
                        <div
                            className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer overflow-hidden group ${isDragging
                                ? 'border-primary bg-primary/5 scale-[1.01]'
                                : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx"
                                onChange={handleFileUpload}
                            />

                            <div className={`p-4 rounded-full bg-muted mb-4 transition-colors group-hover:bg-background shadow-sm ${isDragging ? 'bg-primary/10' : ''}`}>
                                <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">Cargar cartola bancaria</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
                                Arrastra tu archivo Excel (.xlsx) aquí o haz clic para buscarlo.
                            </p>
                            <Button
                                size="lg"
                                disabled={isLoading || !selectedDefaultBox}
                                className={`min-w-[200px] transition-all ${!selectedDefaultBox ? 'opacity-50 cursor-not-allowed' : 'shadow-md hover:shadow-lg'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                            >
                                {isLoading ? 'Procesando...' : (!selectedDefaultBox ? 'Selecciona una caja primero' : 'Seleccionar Archivo')}
                            </Button>
                        </div>

                    </div>
                </div>
            )}

            {step === 2 && !importResult && (
                <div className="space-y-0 flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => { setStep(1); setDuplicateIndices(new Set()); setParsedMovements([]); }} className="h-8 w-8 rounded-full hover:bg-background">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-semibold text-sm">Validación de Movimientos</span>
                            </div>
                            <div className="h-4 w-px bg-border mx-2"></div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full text-xs">
                                        {stats.selected}
                                    </span>
                                    seleccionados
                                </span>
                                {stats.duplicates > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span className="text-xs font-medium">{stats.duplicates} duplicados</span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Pagination controls */}
                            <div className="flex items-center mr-4 bg-background rounded-md border p-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <span className="text-xs px-2 font-medium min-w-[3rem] text-center">
                                    {currentPage} / {Math.ceil(parsedMovements.length / itemsPerPage)}
                                </span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setCurrentPage(p => Math.min(Math.ceil(parsedMovements.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(parsedMovements.length / itemsPerPage)}>
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>

                            <Button onClick={handleSave} disabled={isLoading || selectedIndices.length === 0} className="shadow-sm">
                                <Save className="mr-2 h-4 w-4" />
                                Importar {stats.selected}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto no-scrollbar bg-background">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 shadow-sm">
                                <TableRow className="hover:bg-transparent border-b">
                                    <TableHead className="w-[40px] pl-4">
                                        <Checkbox
                                            checked={parsedMovements.length > 0 && selectedIndices.length === parsedMovements.length - duplicateIndices.size}
                                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[60px]">Estado</TableHead>
                                    <TableHead className="w-[120px]">Fecha</TableHead>
                                    <TableHead className="min-w-[200px]">Descripción</TableHead>
                                    <TableHead className="w-[100px] text-right pr-6">Monto</TableHead>
                                    <TableHead className="w-[180px]">Categoría</TableHead>
                                    <TableHead className="w-[140px]">Caja</TableHead>
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
                                        const isDuplicate = duplicateIndices.has(index);
                                        const effectiveCategory = getEffectiveCategory(index, currentType);

                                        return (
                                            <TableRow
                                                key={index}
                                                data-state={isSelected ? "selected" : undefined}
                                                className={`group transition-colors ${isDuplicate
                                                        ? 'bg-amber-50/50 dark:bg-amber-950/20 opacity-60'
                                                        : isSelected
                                                            ? 'bg-muted/50'
                                                            : 'hover:bg-muted/20'
                                                    }`}
                                            >
                                                <TableCell className="pl-4 py-2">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => handleSelectRow(index, !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    {isDuplicate ? (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                                            Duplicado
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                                            Nuevo
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Input
                                                        type="date"
                                                        value={edited.date || mov.date}
                                                        className="h-8 w-full text-xs font-mono bg-transparent border-transparent group-hover:border-input focus:border-input focus:bg-background transition-all"
                                                        onChange={(e) => handleEditMovement(index, 'date', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Input
                                                        value={edited.description || mov.description}
                                                        className="h-8 w-full text-xs bg-transparent border-transparent group-hover:border-input focus:border-input focus:bg-background transition-all"
                                                        onChange={(e) => handleEditMovement(index, 'description', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-2 text-right pr-6">
                                                    <div className={`text-xs font-bold font-mono ${currentType === 'income' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                                                        {formatCurrency(mov.amount)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <CategorySelect
                                                        value={effectiveCategory}
                                                        onValueChange={(val) => handleEditMovement(index, 'categoryId', val)}
                                                        categories={categories}
                                                        type={currentType}
                                                        placeholder="Sin categoría"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Select
                                                        value={edited.box || selectedDefaultBox}
                                                        onValueChange={(val) => handleEditMovement(index, 'box', val)}
                                                    >
                                                        <SelectTrigger className="h-8 w-full text-xs border-transparent bg-transparent group-hover:border-input group-hover:bg-background focus:ring-1">
                                                            <SelectValue placeholder="Seleccionar" />
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
            )}

            {/* Import Result Summary */}
            {importResult && (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-md text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">Importación Completada</h3>
                            <p className="text-muted-foreground text-sm">
                                Resumen de la carga masiva de movimientos
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{importResult.inserted}</div>
                                <div className="text-xs text-muted-foreground mt-1">Importados</div>
                            </div>
                            <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20">
                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{importResult.skipped}</div>
                                <div className="text-xs text-muted-foreground mt-1">Omitidos (duplicados)</div>
                            </div>
                        </div>

                        <Button onClick={onSaveSuccess} className="w-full">
                            Volver a Movimientos
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
