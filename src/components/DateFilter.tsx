/**
 * Numia v1.0 - Date Filter Component
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DateFilter as DateFilterType } from '@/types';

interface DateFilterProps {
  value: DateFilterType;
  onChange: (value: DateFilterType) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const handleTypeChange = (type: DateFilterType['type']) => {
    if (type === 'CUSTOM') {
      // Set default dates for custom range (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onChange({
        type,
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
      });
    } else {
      onChange({ type });
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', dateValue: string) => {
    onChange({
      ...value,
      [field]: dateValue,
    });
  };

  const options = [
    { value: 'TODAY', label: 'Hoy' },
    { value: 'THIS_WEEK', label: 'Esta Semana' },
    { value: 'LAST_WEEK', label: 'Semana Pasada' },
    { value: 'THIS_MONTH', label: 'Este Mes' },
    { value: 'LAST_MONTH', label: 'Mes Pasado' },
    { value: 'THIS_YEAR', label: 'Este Año' },
    { value: 'LAST_YEAR', label: 'Año Pasado' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ] as const;

  return (
    <div className="space-y-2">
      {/* Mobile: Dropdown */}
      <div className="sm:hidden">
        <Select value={value.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Buttons */}
      <div className="hidden sm:flex gap-2 flex-wrap">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleTypeChange(option.value)}
            data-active={value.type === option.value}
            className="px-3 py-1.5 text-sm rounded-md border transition-all data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary hover:bg-accent hover:text-accent-foreground"
          >
            {option.label}
          </button>
        ))}
      </div>

      {value.type === 'CUSTOM' && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="start-date" className="text-xs">Desde</Label>
            <Input
              id="start-date"
              type="date"
              value={value.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="end-date" className="text-xs">Hasta</Label>
            <Input
              id="end-date"
              type="date"
              value={value.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
