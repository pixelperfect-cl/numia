/**
 * ConfigSidebar - Secondary vertical sidebar for configuration navigation
 * Sits adjacent to the main sidebar when on /configuration route
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Building2,
  CreditCard,
  LayoutGrid,
  Bell,
  Settings,
  Info,
  type LucideIcon
} from 'lucide-react';

interface ConfigNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  tab: string;
}

const configNavItems: ConfigNavItem[] = [
  { id: 'config-general', label: 'General', icon: Building2, tab: 'general' },
  { id: 'config-boxes', label: 'Cajas', icon: CreditCard, tab: 'boxes' },
  { id: 'config-categories', label: 'Categorías', icon: LayoutGrid, tab: 'categories' },
  { id: 'config-notifications', label: 'Notificaciones', icon: Bell, tab: 'notifications' },
  { id: 'config-advanced', label: 'Avanzado', icon: Settings, tab: 'advanced' },
  { id: 'config-changelog', label: 'Versión y Cambios', icon: Info, tab: 'changelog' },
];

export function ConfigSidebar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'general';

  const handleNavigate = (tab: string) => {
    navigate(`/configuration?tab=${tab}`);
  };

  return (
    <aside className="hidden md:flex md:flex-col w-52 border-r bg-card/50 backdrop-blur-sm h-full shrink-0">
      <div className="px-4 pt-5 pb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Configuración
        </h3>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {configNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.tab)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary-foreground')} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
