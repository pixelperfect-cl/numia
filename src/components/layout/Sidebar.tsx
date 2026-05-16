/**
 * Numia v1.0 - Sidebar Navigation
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
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
  List as ListIcon,

  FileText,
  BarChart3,
  Bell,
  type LucideIcon
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { ConnectionStatus } from '@/components/layout/ConnectionStatus';

import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  selectedEntityId: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  erpRequired?: boolean;
  subItems?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    id: 'movements',
    label: 'Movimientos',
    icon: ArrowLeftRight,
    path: '/movements'
  },
  {
    id: 'loans',
    label: 'Préstamos',
    icon: Wallet,
    path: '/loans'
  },
  {
    id: 'projections',
    label: 'Proyecciones',
    icon: TrendingUp,
    path: '/projections'
  },
  {
    id: 'subscriptions',
    label: 'Suscripciones',
    icon: Repeat,
    path: '/subscriptions'
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: FileText,
    path: '/reports/financial',
    subItems: [
      {
        id: 'reports-financial',
        label: 'Reporte Financiero',
        icon: BarChart3,
        path: '/reports/financial'
      },
      {
        id: 'reports-erp',
        label: 'Reporte ERP',
        icon: Briefcase,
        path: '/reports/erp',
        erpRequired: true
      }
    ]
  },
  {
    id: 'erp-dashboard',
    label: 'ERP: Dashboard ERP',
    icon: Briefcase,
    path: '/erp/dashboard',
    erpRequired: true
  },
  {
    id: 'erp-clients',
    label: 'ERP: Clientes',
    icon: Users,
    path: '/erp/clients',
    erpRequired: true
  },
  {
    id: 'erp-services',
    label: 'Servicios',
    icon: ListIcon,
    path: '/erp/services',
    erpRequired: true,
    subItems: [
      {
        id: 'services-summary',
        label: 'Resumen',
        icon: FileText,
        path: '/erp/services?tab=summary'
      },
      {
        id: 'services-active',
        label: 'Activos',
        icon: LayoutGrid,
        path: '/erp/services?tab=monthly'
      },
      {
        id: 'services-catalog',
        label: 'Catálogo',
        icon: FileText,
        path: '/erp/services?tab=catalog'
      },
      {
        id: 'services-archived',
        label: 'Archivados',
        icon: Archive,
        path: '/erp/services?tab=archived'
      },
      {
        id: 'services-notifications',
        label: 'Plantillas de Email',
        icon: Bell,
        path: '/erp/services?tab=notifications'
      }
    ]
  },
  {
    id: 'erp-projects',
    label: 'ERP: Proyectos',
    icon: SquareKanban,
    path: '/erp/projects',
    erpRequired: true,
    subItems: [
      {
        id: 'projects-summary',
        label: 'Resumen',
        icon: ListIcon,
        path: '/erp/projects?tab=summary'
      },
      {
        id: 'projects-active',
        label: 'Activos',
        icon: SquareKanban,
        path: '/erp/projects?tab=active'
      },
      {
        id: 'projects-archived',
        label: 'Archivados',
        icon: Archive,
        path: '/erp/projects?tab=archived'
      },
      {
        id: 'projects-notifications',
        label: 'Plantillas de Email',
        icon: Bell,
        path: '/erp/projects?tab=notifications'
      }
    ]
  },
  {
    id: 'entity-configuration',
    label: 'Configuración',
    icon: Settings,
    path: '/configuration',
    subItems: [
      {
        id: 'config-general',
        label: 'General',
        icon: Building2,
        path: '/configuration?tab=general'
      },
      {
        id: 'config-boxes',
        label: 'Cajas',
        icon: CreditCard,
        path: '/configuration?tab=boxes'
      },
      {
        id: 'config-categories',
        label: 'Categorías',
        icon: LayoutGrid,
        path: '/configuration?tab=categories'
      },
      {
        id: 'config-advanced',
        label: 'Avanzado',
        icon: Settings,
        path: '/configuration?tab=advanced'
      }
    ]
  }
];

export function Sidebar({ selectedEntityId }: SidebarProps) {
  const { entities } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [servicesOpen, setServicesOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [erpOpen, setErpOpen] = useState(true);

  const entity = entities.find(e => e.id === selectedEntityId);
  if (!entity) return null;

  const erpEnabled = entity.settings?.erpEnabled;

  const isChildActive = (item: MenuItem) => {
    return item.subItems?.some(sub => location.pathname === sub.path.split('?')[0]) ?? false;
  };

  const isActive = (path: string) => {
    const [pathBase, pathQuery] = path.split('?');
    if (pathQuery) {
      return location.pathname === pathBase && location.search.includes(pathQuery);
    }
    return location.pathname === pathBase;
  };

  const configItem = menuItems.find(item => item.id === 'entity-configuration');
  const mainItems = menuItems.filter(item => item.id !== 'entity-configuration');

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card h-full relative">
      <div className="flex-1 min-h-0 overflow-y-auto py-4 pb-24 no-scrollbar">
        <div className="px-4 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Gestionando
          </h2>
          <div className="font-bold truncate text-lg">{entity.name}</div>
        </div>

        <nav className="space-y-1 px-2">
          {mainItems.map((item) => {
            const Icon = item.icon;

            if (item.erpRequired && !erpEnabled) return null;

            if (item.id === 'erp-dashboard' && erpEnabled) {
              return (
                <div key="erp-section" className="pt-4 pb-1">
                  <button
                    onClick={() => setErpOpen(!erpOpen)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3 w-3" />
                      <span>ERP Agencia</span>
                    </div>
                    {erpOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  {erpOpen && (
                    <div className="ml-5 pl-3 border-l border-border/50 space-y-1 my-1">
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer mb-1',
                          isActive(item.path)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.label.replace('ERP: ', '')}</span>
                      </button>

                      {mainItems.filter(i => i.erpRequired && i.id !== 'erp-dashboard').map(subItem => {
                        const SubIcon = subItem.icon;
                        if (subItem.subItems) {
                          return (
                            <div key={subItem.id} className="space-y-1">
                              <button
                                onClick={() => {
                                  if (!isActive(subItem.path) && !isChildActive(subItem)) handleNavigate(subItem.path);
                                  if (subItem.id === 'erp-services') setServicesOpen(!servicesOpen);
                                  if (subItem.id === 'erp-projects') setProjectsOpen(!projectsOpen);
                                }}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer justify-between',
                                  isActive(subItem.path) || isChildActive(subItem)
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.label}</span>
                                </div>
                                {(subItem.id === 'erp-services' ? servicesOpen : subItem.id === 'erp-projects' ? projectsOpen : false) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </button>

                              {(subItem.id === 'erp-services' ? servicesOpen : subItem.id === 'erp-projects' ? projectsOpen : false) && (
                                <div className="ml-5 pl-3 border-l border-border/50 space-y-1 my-1">
                                  {subItem.subItems.map(child => {
                                    const ChildIcon = child.icon;
                                    return (
                                      <button
                                        key={child.id}
                                        onClick={() => handleNavigate(child.path)}
                                        className={cn(
                                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                                          isActive(child.path)
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
                            onClick={() => handleNavigate(subItem.path)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer mb-1',
                              isActive(subItem.path)
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
                  )}
                </div>
              );
            }
            if (item.erpRequired) return null;

            // Handle Reports menu item with sub-items
            if (item.subItems) {
              const visibleSubItems = item.subItems.filter(sub => !sub.erpRequired || erpEnabled);
              if (visibleSubItems.length === 0) return null;

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (item.id === 'reports') {
                        setReportsOpen(!reportsOpen);
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer justify-between',
                      isActive(item.path) || isChildActive(item)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {reportsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>

                  {reportsOpen && (
                    <div className="ml-5 pl-3 border-l border-border/50 space-y-1 my-1">
                      {visibleSubItems.map(child => {
                        const ChildIcon = child.icon;
                        return (
                          <button
                            key={child.id}
                            onClick={() => handleNavigate(child.path)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                              isActive(child.path)
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
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer',
                  isActive(item.path)
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

      {configItem && (
        <div className="absolute bottom-0 left-0 right-0 p-2 pb-3 border-t border-border/40 bg-card backdrop-blur-sm z-10">
          <div className="flex items-center gap-1 w-full">
            <button
              onClick={() => handleNavigate('/configuration')}
              className={cn(
                'flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer group',
                location.pathname === '/configuration'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <configItem.icon className="h-4 w-4 group-hover:text-foreground transition-colors" />
              <span>{configItem.label}</span>
            </button>
            <ConnectionStatus />
          </div>
        </div>
      )}
    </aside>
  );
}


