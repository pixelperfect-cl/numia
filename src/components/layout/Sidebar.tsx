/**
 * Numia v1.0 - Sidebar Navigation
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Building2,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { IconComponent } from '@/components/IconPicker';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onEntitySelect?: (entityId: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'entities', label: 'Entidades', icon: Building2 },
  { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'loans', label: 'Préstamos', icon: Wallet },
  { id: 'projections', label: 'Proyecciones', icon: TrendingUp },
  { id: 'configuration', label: 'Configuración', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, onEntitySelect }: SidebarProps) {
  const { entities } = useData();
  const [entitiesOpen, setEntitiesOpen] = useState(true);

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card h-screen sticky top-0">
      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isEntities = item.id === 'entities';

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (isEntities) {
                      setEntitiesOpen(!entitiesOpen);
                    }
                    onNavigate(item.id);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                    currentPage === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isEntities && (
                    entitiesOpen ?
                      <ChevronDown className="h-4 w-4" /> :
                      <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Entities dropdown */}
                {isEntities && entitiesOpen && entities.length > 0 && (
                  <div className="mt-1 ml-4 space-y-1">
                    {entities.map((entity) => {
                      return (
                        <button
                          key={entity.id}
                          onClick={() => onEntitySelect?.(entity.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        >
                          <div
                            className="p-1 rounded flex items-center justify-center"
                            style={{
                              backgroundColor: `${entity.color}20`,
                              color: entity.color || '#3b82f6'
                            }}
                          >
                            <IconComponent iconKey={entity.icon} className="h-3 w-3" />
                          </div>
                          <span className="truncate">{entity.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// Mobile menu dropdown component (for use in header)
export function MobileMenu({ currentPage, onNavigate, onEntitySelect }: SidebarProps) {
  const { entities } = useData();
  const currentItem = menuItems.find(item => item.id === currentPage);
  const CurrentIcon = currentItem?.icon || LayoutGrid;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <CurrentIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isEntities = item.id === 'entities';

          return (
            <div key={item.id}>
              <DropdownMenuItem
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex items-center gap-3 cursor-pointer',
                  currentPage === item.id && 'bg-accent'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </DropdownMenuItem>

              {/* Entities submenu in mobile */}
              {isEntities && entities.length > 0 && (
                <div className="ml-6 border-l pl-2 my-1">
                  {entities.map((entity) => {
                    return (
                      <DropdownMenuItem
                        key={entity.id}
                        onClick={() => onEntitySelect?.(entity.id)}
                        className="flex items-center gap-2 cursor-pointer text-sm py-1.5"
                      >
                        <div
                          className="p-1 rounded flex items-center justify-center"
                          style={{
                            backgroundColor: `${entity.color}20`,
                            color: entity.color || '#3b82f6'
                          }}
                        >
                          <IconComponent iconKey={entity.icon} className="h-3 w-3" />
                        </div>
                        <span className="truncate">{entity.name}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
