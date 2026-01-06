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
  CreditCard,
  LayoutGrid,
  Building2,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Users,
  LayoutDashboard,
  SquareKanban,
  type LucideIcon
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { IconComponent } from '@/components/IconPicker';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  selectedEntityId: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  erpRequired?: boolean;
}

export const menuItems: MenuItem[] = [
  { id: 'entity-panel', label: 'Panel General', icon: LayoutDashboard },
  { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'loans', label: 'Préstamos', icon: Wallet },
  { id: 'projections', label: 'Proyecciones', icon: TrendingUp },
  // ERP Group
  { id: 'erp-dashboard', label: 'ERP: Control', icon: LayoutGrid, erpRequired: true },
  { id: 'erp-clients', label: 'Clientes', icon: Users, erpRequired: true },
  { id: 'erp-services', label: 'Servicios', icon: Briefcase, erpRequired: true },
  { id: 'erp-projects', label: 'Proyectos', icon: SquareKanban, erpRequired: true },
  // Configuration at the end
  { id: 'entity-configuration', label: 'Configuración', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, selectedEntityId }: SidebarProps) {
  const { entities } = useData();
  const [erpOpen, setErpOpen] = useState(true);

  const entity = entities.find(e => e.id === selectedEntityId);
  if (!entity) return null;

  const erpEnabled = entity.settings?.erpEnabled;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card h-full overflow-y-auto py-4">
      {/* Sidebar content */}
      <div className="px-4 mb-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Gestionando
        </h2>
        <div className="font-bold truncate text-lg">{entity.name}</div>
      </div>

      <nav className="space-y-1 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          // Skip ERP items if not enabled
          if (item.erpRequired && !erpEnabled) return null;

          // Optional: Group ERP items visually
          if (item.id === 'erp-dashboard' && erpEnabled) {
            return (
              <div key="erp-section" className="pt-4 pb-1">
                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Briefcase className="h-3 w-3" />
                  ERP Agencia
                </h3>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer mb-1',
                    currentPage === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label.replace('ERP: ', '')}</span>
                </button>
                {/* Render other ERP items immediately after */}
                {menuItems.filter(i => i.erpRequired && i.id !== 'erp-dashboard').map(subItem => (
                  <button
                    key={subItem.id}
                    onClick={() => onNavigate(subItem.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer mb-1',
                      currentPage === subItem.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <subItem.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{subItem.label.replace('ERP: ', '')}</span>
                  </button>
                ))}
              </div>
            );
          }
          // Skip other ERP items as they are rendered in the group above
          if (item.erpRequired) return null;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                currentPage === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}


