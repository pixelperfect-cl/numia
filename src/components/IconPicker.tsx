/**
 * Numia v1.0 - Icon Picker Component
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { cn } from '@/lib/utils';

const icons: { name: string; iconKey: string; icon: IconDefinition; category: string }[] = [
  // Finanzas
  { name: 'Billetera', iconKey: 'wallet', icon: Icons.faWallet, category: 'finanzas' },
  { name: 'Maletín', iconKey: 'briefcase', icon: Icons.faBriefcase, category: 'trabajo' },
  { name: 'Gráfico', iconKey: 'chart-line', icon: Icons.faChartLine, category: 'finanzas' },
  { name: 'Regalo', iconKey: 'gift', icon: Icons.faGift, category: 'otros' },
  { name: 'Dólar', iconKey: 'dollar-sign', icon: Icons.faDollarSign, category: 'finanzas' },
  { name: 'Euro', iconKey: 'euro-sign', icon: Icons.faEuroSign, category: 'finanzas' },
  { name: 'Monedas', iconKey: 'coins', icon: Icons.faCoins, category: 'finanzas' },
  { name: 'Tarjeta', iconKey: 'credit-card', icon: Icons.faCreditCard, category: 'finanzas' },
  { name: 'Alcancía', iconKey: 'piggy-bank', icon: Icons.faPiggyBank, category: 'finanzas' },

  // Comida y alimentación
  { name: 'Comida', iconKey: 'utensils', icon: Icons.faUtensils, category: 'alimentacion' },
  { name: 'Hamburguesa', iconKey: 'burger', icon: Icons.faBurger, category: 'alimentacion' },
  { name: 'Pizza', iconKey: 'pizza-slice', icon: Icons.faPizzaSlice, category: 'alimentacion' },
  { name: 'Café', iconKey: 'mug-saucer', icon: Icons.faMugSaucer, category: 'alimentacion' },
  { name: 'Botella', iconKey: 'wine-bottle', icon: Icons.faWineBottle, category: 'alimentacion' },
  { name: 'Carrito', iconKey: 'cart-shopping', icon: Icons.faCartShopping, category: 'alimentacion' },

  // Casa y hogar
  { name: 'Casa', iconKey: 'house', icon: Icons.faHouse, category: 'hogar' },
  { name: 'Llave', iconKey: 'key', icon: Icons.faKey, category: 'hogar' },
  { name: 'Sillón', iconKey: 'couch', icon: Icons.faCouch, category: 'hogar' },
  { name: 'Cama', iconKey: 'bed', icon: Icons.faBed, category: 'hogar' },

  // Tecnología
  { name: 'Laptop', iconKey: 'laptop', icon: Icons.faLaptop, category: 'tecnologia' },
  { name: 'Celular', iconKey: 'mobile-screen', icon: Icons.faMobileScreen, category: 'tecnologia' },
  { name: 'Wifi', iconKey: 'wifi', icon: Icons.faWifi, category: 'tecnologia' },
  { name: 'Código', iconKey: 'code', icon: Icons.faCode, category: 'tecnologia' },

  // Transporte
  { name: 'Auto', iconKey: 'car', icon: Icons.faCar, category: 'transporte' },
  { name: 'Bus', iconKey: 'bus', icon: Icons.faBus, category: 'transporte' },
  { name: 'Avión', iconKey: 'plane', icon: Icons.faPlane, category: 'transporte' },
  { name: 'Bicicleta', iconKey: 'bicycle', icon: Icons.faBicycle, category: 'transporte' },
  { name: 'Gasolina', iconKey: 'gas-pump', icon: Icons.faGasPump, category: 'transporte' },

  // Entretenimiento
  { name: 'Película', iconKey: 'film', icon: Icons.faFilm, category: 'entretenimiento' },
  { name: 'Música', iconKey: 'music', icon: Icons.faMusic, category: 'entretenimiento' },
  { name: 'Juego', iconKey: 'gamepad', icon: Icons.faGamepad, category: 'entretenimiento' },
  { name: 'Fútbol', iconKey: 'futbol', icon: Icons.faFutbol, category: 'entretenimiento' },

  // Salud
  { name: 'Corazón', iconKey: 'heart-pulse', icon: Icons.faHeartPulse, category: 'salud' },
  { name: 'Hospital', iconKey: 'hospital', icon: Icons.faHospital, category: 'salud' },
  { name: 'Medicina', iconKey: 'pills', icon: Icons.faPills, category: 'salud' },
  { name: 'Ejercicio', iconKey: 'dumbbell', icon: Icons.faDumbbell, category: 'salud' },

  // Ropa
  { name: 'Camisa', iconKey: 'shirt', icon: Icons.faShirt, category: 'ropa' },
  { name: 'Bolsa', iconKey: 'bag-shopping', icon: Icons.faBagShopping, category: 'ropa' },

  // Educación
  { name: 'Graduación', iconKey: 'graduation-cap', icon: Icons.faGraduationCap, category: 'educacion' },
  { name: 'Libro', iconKey: 'book', icon: Icons.faBook, category: 'educacion' },

  // Otros
  { name: 'Estrella', iconKey: 'star', icon: Icons.faStar, category: 'otros' },
  { name: 'Check', iconKey: 'check', icon: Icons.faCheck, category: 'otros' },
  { name: 'Círculo', iconKey: 'circle', icon: Icons.faCircle, category: 'otros' },
];

interface IconPickerProps {
  value: string;
  onChange: (iconKey: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Buscar por iconKey (el valor guardado en la DB)
  const selectedIcon = icons.find(i => i.iconKey === value) || icons.find(i => i.name === value);
  const selectedIconDef = selectedIcon?.icon || Icons.faCircle;

  const filteredIcons = search
    ? icons.filter(
        (icon) =>
          icon.name.toLowerCase().includes(search.toLowerCase()) ||
          icon.category.toLowerCase().includes(search.toLowerCase())
      )
    : icons;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <FontAwesomeIcon icon={selectedIconDef} className="h-4 w-4" />
          <span>{selectedIcon?.name || 'Seleccionar icono'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <Input
            placeholder="Buscar icono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-6 gap-2 p-4">
            {filteredIcons.map((icon) => {
              return (
                <Button
                  key={icon.iconKey}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-10 w-10 p-0',
                    value === icon.iconKey && 'bg-accent'
                  )}
                  onClick={() => {
                    onChange(icon.iconKey);
                    setOpen(false);
                  }}
                  title={icon.name}
                >
                  <FontAwesomeIcon icon={icon.icon} className="h-5 w-5" />
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to get icon component by iconKey
export function getIconComponent(iconKey: string) {
  const iconData = icons.find(i => i.iconKey === iconKey) || icons.find(i => i.name === iconKey);
  return iconData?.icon || Icons.faCircle;
}

// Helper component to render Font Awesome icon
export function IconComponent({ iconKey, className }: { iconKey: string; className?: string }) {
  const icon = getIconComponent(iconKey);
  return <FontAwesomeIcon icon={icon} className={className} />;
}
