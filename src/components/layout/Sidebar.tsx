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
  Repeat,
  Network,
  Archive,
  type LucideIcon
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';

import { IconComponent } from '@/components/IconPicker';
import { ConnectionStatus } from '@/components/layout/ConnectionStatus';

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
  subItems?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  { id: 'entity-panel', label: 'Panel General', icon: LayoutDashboard },
  { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'loans', label: 'Préstamos', icon: Wallet },
  { id: 'projections', label: 'Proyecciones', icon: TrendingUp },
  { id: 'subscriptions', label: 'Suscripciones', icon: Repeat },
  // ERP Group
  { id: 'erp-dashboard', label: 'ERP: Control', icon: LayoutGrid, erpRequired: true },
  { id: 'erp-clients', label: 'Clientes', icon: Users, erpRequired: true },
  {
    id: 'erp-services',
    label: 'Servicios',
    icon: Briefcase,
    erpRequired: true,
    subItems: [
      { id: 'erp-services-summary', label: 'Resumen General', icon: TrendingUp }, // Using TrendingUp reuse or similar
      { id: 'erp-services-active', label: 'Servicios Activos', icon: ListIcon }, // Need ListIcon
      { id: 'erp-services-archived', label: 'Servicios Archivados', icon: Archive },
      { id: 'erp-services-catalog', label: 'Catálogo', icon: LayoutGrid } // Using LayoutGrid reuse or similar
    ]
  },
  { id: 'erp-projects', label: 'Proyectos', icon: SquareKanban, erpRequired: true },
  // Configuration at the end
  // Configuration at the end
  {
    id: 'entity-configuration',
    label: 'Configuración',
    icon: Settings,
    subItems: [
      { id: 'config-general', label: 'General', icon: Settings },
      { id: 'config-boxes', label: 'Cajas', icon: Wallet },
      { id: 'config-categories', label: 'Categorías', icon: LayoutGrid },
      { id: 'config-advanced', label: 'Avanzado', icon: Network }
    ]
  },
];

import { List as ListIcon } from 'lucide-react'; // Ensure import

export function Sidebar({ currentPage, onNavigate, selectedEntityId }: SidebarProps) {
  const { entities } = useData();
  const [servicesOpen, setServicesOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false); // Default closed as per request "cerrado pero que si se abre..."

  const entity = entities.find(e => e.id === selectedEntityId);
  if (!entity) return null;

  const erpEnabled = entity.settings?.erpEnabled;

  const isChildActive = (item: MenuItem) => {
    return item.subItems?.some(sub => sub.id === currentPage) ?? false;
  };

  const configItem = menuItems.find(item => item.id === 'entity-configuration');
  const mainItems = menuItems.filter(item => item.id !== 'entity-configuration');

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card h-full">
      <div className="flex-1 overflow-y-auto py-4 no-scrollbar">
        {/* Sidebar content */}
        <div className="px-4 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Gestionando
          </h2>
          <div className="font-bold truncate text-lg">{entity.name}</div>
        </div>

        <nav className="space-y-1 px-2">
          {mainItems.map((item) => {
            const Icon = item.icon;

            // Skip ERP items if not enabled
            if (item.erpRequired && !erpEnabled) return null;

            // Optional: Group ERP items visually
            if (item.id === 'erp-dashboard' && erpEnabled) {
              return (
                <div key="erp-section" className="pt-4 pb-1">
                  <h3 className="px-3 py-2 rounded-lg bg-zinc-800/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Briefcase className="h-3 w-3" />
                    ERP Agencia
                  </h3>

                  <div className="ml-5 pl-3 border-l border-border/50 space-y-1 my-1">
                    {/* Render dashboard item first */}
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer mb-1',
                        currentPage === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.label.replace('ERP: ', '')}</span>
                    </button>

                    {/* Render other ERP items immediately after */}
                    {mainItems.filter(i => i.erpRequired && i.id !== 'erp-dashboard').map(subItem => {
                      const SubIcon = subItem.icon;
                      // Logic for collapsible items (like Services)
                      if (subItem.subItems) {
                        const isOpen = servicesOpen || isChildActive(subItem) || currentPage === subItem.id;

                        return (
                          <div key={subItem.id} className="space-y-1">
                            <button
                              onClick={() => {
                                if (currentPage !== subItem.id && !isChildActive(subItem)) onNavigate(subItem.id);
                                setServicesOpen(!servicesOpen);
                              }}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer justify-between',
                                currentPage === subItem.id || isChildActive(subItem)
                                  ? 'bg-accent text-accent-foreground'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <SubIcon className="h-4 w-4" />
                                <span>{subItem.label}</span>
                              </div>
                              {servicesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </button>

                            {servicesOpen && (
                              <div className="ml-5 pl-3 border-l border-border/50 space-y-1 my-1">
                                {subItem.subItems.map(child => {
                                  const ChildIcon = child.icon;
                                  return (
                                    <button
                                      key={child.id}
                                      onClick={() => onNavigate(child.id)}
                                      className={cn(
                                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                                        currentPage === child.id
                                          ? 'bg-primary text-primary-foreground'
                                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                      )}
                                    >
                                      <ChildIcon className="h-3 w-3" />
                                      <span>{child.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <button
                          key={subItem.id}
                          onClick={() => onNavigate(subItem.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer mb-1',
                            currentPage === subItem.id
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <SubIcon className="h-4 w-4" />
                          <span className="flex-1 text-left">{subItem.label.replace('ERP: ', '')}</span>
                        </button>
                      );
                    })}
                  </div>
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
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer',
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
      </div>

      {/* Sticky Bottom Configuration Section */}
      {configItem && (
        <div className="p-2 pb-12 border-t border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 w-full">
              <button
                onClick={() => {
                  setConfigOpen(!configOpen);
                }}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer justify-between group',
                  currentPage === configItem.id || isChildActive(configItem)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <configItem.icon className="h-4 w-4 group-hover:text-foreground transition-colors" />
                  <span>{configItem.label}</span>
                </div>
                {configOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>

              {/* LED Status Indicator */}
              <ConnectionStatus />
            </div>

            {configOpen && configItem.subItems && (
              <div className="ml-5 pl-3 border-l border-border/50 space-y-1 my-1">
                {configItem.subItems.filter(child => {
                  if (child.id === 'config-smtp' && !entity.settings?.smtpEnabled) return false;
                  return true;
                }).map(child => {
                  const ChildIcon = child.icon;
                  return (
                    <button
                      key={child.id}
                      onClick={() => onNavigate(child.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                        currentPage === child.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <ChildIcon className="h-3 w-3" />
                      <span>{child.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}


