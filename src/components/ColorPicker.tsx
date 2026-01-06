/**
 * Numia v1.0 - Color Picker Component
 */

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const colors = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Amarillo', value: '#f59e0b' },
  { name: 'Morado', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Índigo', value: '#6366f1' },
  { name: 'Turquesa', value: '#14b8a6' },
  { name: 'Naranja', value: '#f97316' },
  { name: 'Lima', value: '#84cc16' },
  { name: 'Cian', value: '#06b6d4' },
  { name: 'Esmeralda', value: '#059669' },
  { name: 'Fucsia', value: '#d946ef' },
  { name: 'Violeta', value: '#a855f7' },
  { name: 'Coral', value: '#fb7185' },
  { name: 'Ámbar', value: '#fbbf24' },
  { name: 'Verde Lima', value: '#a3e635' },
  { name: 'Menta', value: '#5eead4' },
  { name: 'Azul Cielo', value: '#38bdf8' },
  { name: 'Lavanda', value: '#c084fc' },
  { name: 'Melocotón', value: '#fdba74' },
  { name: 'Verde Oscuro', value: '#047857' },
  { name: 'Azul Oscuro', value: '#1e40af' },
  { name: 'Rojo Oscuro', value: '#b91c1c' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const selectedColor = colors.find(c => c.value === value) || colors[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <div
            className="h-4 w-4 rounded-full border"
            style={{ backgroundColor: selectedColor.value }}
          />
          <span>{selectedColor.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid grid-cols-6 gap-2">
          {colors.map((color) => (
            <button
              key={color.value}
              className={cn(
                'h-10 w-10 rounded-md border-2 transition-all hover:scale-110',
                value === color.value ? 'border-foreground' : 'border-transparent'
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => onChange(color.value)}
              title={color.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
