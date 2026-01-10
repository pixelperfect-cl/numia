/**
 * Numia v1.0 - Report Filters Component
 * Shared filter component for reports
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getDateRangePreset } from '@/lib/reportUtils';

interface ReportFiltersProps {
    onFilterChange: (filters: ReportFilterState) => void;
    showEntityFilter?: boolean;
    entities?: Array<{ id: string; name: string }>;
}

export interface ReportFilterState {
    dateRange: {
        start: Date | null;
        end: Date | null;
    };
    entityIds: string[];
    preset: string;
}

export function ReportFilters({ onFilterChange, showEntityFilter, entities = [] }: ReportFiltersProps) {
    const [preset, setPreset] = useState<string>('this-month');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [selectedEntities, setSelectedEntities] = useState<string[]>([]);

    const handlePresetChange = (value: string) => {
        setPreset(value);

        if (value === 'custom') {
            // Keep current custom dates
            return;
        }

        const { start, end } = getDateRangePreset(value);
        setStartDate(start);
        setEndDate(end);

        onFilterChange({
            dateRange: { start, end },
            entityIds: selectedEntities,
            preset: value
        });
    };

    const handleCustomDateChange = (type: 'start' | 'end', date: Date | undefined) => {
        if (type === 'start') {
            setStartDate(date || null);
        } else {
            setEndDate(date || null);
        }

        const newStart = type === 'start' ? (date || null) : startDate;
        const newEnd = type === 'end' ? (date || null) : endDate;

        onFilterChange({
            dateRange: { start: newStart, end: newEnd },
            entityIds: selectedEntities,
            preset: 'custom'
        });
    };

    const handleReset = () => {
        setPreset('this-month');
        const { start, end } = getDateRangePreset('this-month');
        setStartDate(start);
        setEndDate(end);
        setSelectedEntities([]);

        onFilterChange({
            dateRange: { start, end },
            entityIds: [],
            preset: 'this-month'
        });
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2 items-end">
            {/* Date Range Preset */}
            <div className="w-[145px]">
                <label className="text-xs text-muted-foreground mb-1 block">Período</label>
                <Select value={preset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="this-month">Este mes</SelectItem>
                        <SelectItem value="last-month">Mes anterior</SelectItem>
                        <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
                        <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
                        <SelectItem value="this-year">Este año</SelectItem>
                        <SelectItem value="last-year">Año anterior</SelectItem>
                        <SelectItem value="all-time">Todo el tiempo</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Custom Date Range */}
            {preset === 'custom' && (
                <>
                    <div className="w-[145px]">
                        <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal h-9',
                                        !startDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, 'PPP', { locale: es }) : 'Seleccionar'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate || undefined}
                                    onSelect={(date) => handleCustomDateChange('start', date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="w-[145px]">
                        <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal h-9',
                                        !endDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, 'PPP', { locale: es }) : 'Seleccionar'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate || undefined}
                                    onSelect={(date) => handleCustomDateChange('end', date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </>
            )}

            {/* Entity Filter */}
            {showEntityFilter && entities.length > 0 && (
                <div className="w-[145px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Entidad</label>
                    <Select
                        value={selectedEntities[0] || 'all'}
                        onValueChange={(value) => {
                            const newEntities = value === 'all' ? [] : [value];
                            setSelectedEntities(newEntities);
                            onFilterChange({
                                dateRange: { start: startDate, end: endDate },
                                entityIds: newEntities,
                                preset
                            });
                        }}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {entities.map(entity => (
                                <SelectItem key={entity.id} value={entity.id}>
                                    {entity.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Reset Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                title="Resetear filtros"
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
                <X className="h-4 w-4" />
            </Button>

            <div className="flex-1" />
        </div>
    );
}
