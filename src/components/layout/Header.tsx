import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/theme-provider';
import { User, LogOut, Sun, Moon, ChevronsUpDown, Check, Settings, Plus, Menu, ArrowLeftRight, Wallet, TrendingUp, Repeat, Bot, Cloud, ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { useAI } from '@/contexts/AIContext';
import { useData } from '@/contexts/DataContext';
import { IconComponent } from '@/components/IconPicker';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { EntityForm } from '@/components/EntityForm';
import numiaLogo from '@/assets/numialogo.png';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { menuItems } from './Sidebar';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { IndicatorsMarquee } from '@/components/common/IndicatorsMarquee';
import { QuickActions } from './QuickActions';
import { ConnectionStatus } from '@/components/layout/ConnectionStatus';
import { ConnectionStatusDetail } from '@/components/layout/ConnectionStatusDetail';
import { useNavigate, useLocation } from 'react-router-dom';
import { changelog } from '@/data/changelog';

interface HeaderProps {
    selectedEntityId: string;
    onEntityChange: (entityId: string) => void;
    onQuickAction: (action: 'movement' | 'loan' | 'projection' | 'transfer' | 'mass-upload' | 'subscription' | 'client' | 'service-assign' | 'project') => void;
    mobileMenuOpen: boolean;
    onMobileMenuOpenChange: (open: boolean) => void;
}

export function Header({ selectedEntityId, onEntityChange, onQuickAction, mobileMenuOpen, onMobileMenuOpenChange }: HeaderProps) {
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const { entities } = useData();
    const navigate = useNavigate();
    const location = useLocation();
    const [openCreate, setOpenCreate] = useState(false);
    const { isOpen, openAssistant, closeAssistant } = useAI();
    // Mobile menu states
    const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
    const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);

    const handleAssistantToggle = () => {
        if (isOpen) {
            closeAssistant();
        } else {
            openAssistant();
        }
    };

    const activeEntity = entities.find(e => e.id === selectedEntityId);
    const erpEnabled = activeEntity?.settings?.erpEnabled;

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleMobileNavigate = (path: string) => {
        navigate(path);
        onMobileMenuOpenChange(false);
    };

    const isActive = (path: string) => {
        // Simple check for now, can be improved for query params
        return location.pathname === path.split('?')[0];
    };

    const cycleTheme = () => {
        if (theme === 'light') {
            setTheme('cloudy');
        } else if (theme === 'cloudy') {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    };

    const getThemeIcon = () => {
        if (theme === 'light') return <Cloud className="h-4 w-4 mr-2" />;
        if (theme === 'cloudy') return <Moon className="h-4 w-4 mr-2" />;
        return <Sun className="h-4 w-4 mr-2" />;
    };

    const getThemeLabel = () => {
        if (theme === 'light') return 'Modo Nublado';
        if (theme === 'cloudy') return 'Modo Oscuro';
        return 'Modo Claro';
    };

    const EntitySelector = ({ className }: { className?: string }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className={cn("w-[250px] justify-between border-solid border-muted-foreground/30 hover:border-primary/50", className)}
                >
                    {activeEntity ? (
                        <div className="flex items-center gap-2 truncate">
                            {activeEntity.logoUrl ? (
                                <img src={activeEntity.logoUrl} alt={activeEntity.name} className="h-5 w-auto object-contain" />
                            ) : (
                                <div
                                    className="p-0.5 rounded flex items-center justify-center"
                                    style={{ backgroundColor: `${activeEntity.color}20`, color: activeEntity.color || '#3b82f6' }}
                                >
                                    <IconComponent iconKey={activeEntity.icon} className="h-4 w-4" />
                                </div>
                            )}
                            <span className="truncate">{activeEntity.name}</span>
                        </div>
                    ) : (
                        "Seleccionar Entidad"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[250px] p-0">
                <DropdownMenuLabel className="text-xs text-muted-foreground px-3 py-2">
                    Mis Entidades
                </DropdownMenuLabel>
                <div className="max-h-[300px] overflow-y-auto">
                    {entities.map((entity) => (
                        <DropdownMenuItem
                            key={entity.id}
                            onSelect={() => onEntityChange(entity.id)}
                            className="flex items-center justify-between px-3 py-2 cursor-pointer"
                        >
                            <div className="flex items-center gap-2 truncate">
                                {entity.logoUrl ? (
                                    <img src={entity.logoUrl} alt={entity.name} className="h-4 w-auto object-contain" />
                                ) : (
                                    <div
                                        className="p-1 rounded flex items-center justify-center"
                                        style={{ backgroundColor: `${entity.color}20`, color: entity.color || '#3b82f6' }}
                                    >
                                        <IconComponent iconKey={entity.icon} className="h-3 w-3" />
                                    </div>
                                )}
                                <span className={cn("truncate", entity.id === selectedEntityId && "font-medium")}>
                                    {entity.name}
                                </span>
                            </div>
                            {entity.id === selectedEntityId && <Check className="h-4 w-4 opacity-50" />}
                        </DropdownMenuItem>
                    ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/entity-selection')} className="cursor-pointer text-muted-foreground focus:text-primary">
                    <Settings className="mr-2 h-4 w-4" />
                    Gestionar Entidades
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setOpenCreate(true)} className="cursor-pointer text-muted-foreground focus:text-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Entidad
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const UserMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full overflow-hidden">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User className="h-5 w-5" />
                    )}
                    <span className="sr-only">Toggle user menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.displayName || 'Usuario'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/account-settings')}>Configuración Cuenta</DropdownMenuItem>
                <DropdownMenuItem onClick={cycleTheme}>
                    {getThemeIcon()}
                    {getThemeLabel()}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500 hover:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <header className="sticky top-0 z-30 flex flex-col border-b bg-header-background shadow-sm">
            {/* Top Bar with Marquee - Visible only on Desktop */}
            <IndicatorsMarquee />

            <div className="flex h-16 items-center gap-2 md:gap-4 px-3 md:px-6">
                {/* Mobile Menu (Hamburger) */}
                <Sheet open={mobileMenuOpen} onOpenChange={onMobileMenuOpenChange}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className={cn("md:hidden", theme === 'cloudy' && "text-white")}>
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] flex flex-col p-6">
                        <SheetHeader className="mb-6">
                            <SheetTitle className="flex items-center gap-2">
                                <img src={numiaLogo} alt="Numia" className="h-8" />
                            </SheetTitle>
                        </SheetHeader>

                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-muted-foreground">Entidad Actual</span>
                                <EntitySelector className="w-full" />
                            </div>

                            {/* Mobile Components Navigation */}
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menú</span>
                                {menuItems.map((item) => {
                                    const Icon = item.icon;

                                    // Skip ERP items if not enabled
                                    if (item.erpRequired && !erpEnabled) return null;

                                    // Render ERP Group Header and Items
                                    if (item.id === 'erp-dashboard' && erpEnabled) {
                                        return (
                                            <div key="erp-section" className="pt-2 pb-1">
                                                <h3 className="px-3 py-2 rounded-lg bg-zinc-800/10 dark:bg-zinc-800/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                                    <Briefcase className="h-3 w-3" />
                                                    ERP Agencia
                                                </h3>

                                                <div className="ml-2 pl-3 border-l border-border/50 space-y-1 my-1">
                                                    {/* Render dashboard item (Control) */}
                                                    <Button
                                                        key={item.id}
                                                        variant="ghost"
                                                        className={cn(
                                                            "w-full justify-start gap-3 mb-1",
                                                            isActive(item.path) && "bg-secondary"
                                                        )}
                                                        onClick={() => handleMobileNavigate(item.path)}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                        {item.label.replace('ERP: ', '')}
                                                    </Button>

                                                    {/* Other ERP items */}
                                                    {menuItems.filter(i => i.erpRequired && i.id !== 'erp-dashboard' && i.id !== 'entity-configuration').map(subItem => {
                                                        const SubIcon = subItem.icon;

                                                        // Handle subitems (e.g. Services)
                                                        if (subItem.subItems) {
                                                            return (
                                                                <div key={subItem.id} className="space-y-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="w-full justify-between"
                                                                        onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <SubIcon className="h-4 w-4" />
                                                                            <span>{subItem.label}</span>
                                                                        </div>
                                                                        {mobileServicesOpen ?
                                                                            <ChevronDown className="h-3 w-3" /> :
                                                                            <ChevronRight className="h-3 w-3" />
                                                                        }
                                                                    </Button>

                                                                    {mobileServicesOpen && (
                                                                        <div className="ml-4 pl-3 border-l border-border/50 space-y-1">
                                                                            {subItem.subItems.map(child => {
                                                                                const ChildIcon = child.icon;
                                                                                return (
                                                                                    <Button
                                                                                        key={child.id}
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className={cn(
                                                                                            "w-full justify-start gap-3",
                                                                                            isActive(child.path) && "bg-secondary"
                                                                                        )}
                                                                                        onClick={() => handleMobileNavigate(child.path)}
                                                                                    >
                                                                                        <ChildIcon className="h-3 w-3" />
                                                                                        <span>{child.label}</span>
                                                                                    </Button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        }

                                                        return (
                                                            <Button
                                                                key={subItem.id}
                                                                variant="ghost"
                                                                className={cn(
                                                                    "w-full justify-start gap-3",
                                                                    isActive(subItem.path) && "bg-secondary"
                                                                )}
                                                                onClick={() => handleMobileNavigate(subItem.path)}
                                                            >
                                                                <SubIcon className="h-4 w-4" />
                                                                {subItem.label.replace('ERP: ', '')}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Skip items already rendered in ERP section or Configuration
                                    if (item.erpRequired || item.id === 'entity-configuration') return null;

                                    return (
                                        <Button
                                            key={item.id}
                                            variant="ghost"
                                            className={cn(
                                                "justify-start gap-3",
                                                isActive(item.path) && "bg-secondary"
                                            )}
                                            onClick={() => handleMobileNavigate(item.path)}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </Button>
                                    )
                                })}

                                {/* Configuration Section at bottom of menu list */}
                                {menuItems.find(item => item.id === 'entity-configuration') && (
                                    <div className="pt-2">
                                        {(() => {
                                            const configItem = menuItems.find(item => item.id === 'entity-configuration');
                                            if (!configItem) return null;

                                            return (
                                                <div className="space-y-1">
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-between"
                                                        onClick={() => setMobileConfigOpen(!mobileConfigOpen)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <configItem.icon className="h-4 w-4" />
                                                            <span>{configItem.label}</span>
                                                        </div>
                                                        {mobileConfigOpen ?
                                                            <ChevronDown className="h-3 w-3" /> :
                                                            <ChevronRight className="h-3 w-3" />
                                                        }
                                                    </Button>

                                                    {mobileConfigOpen && configItem.subItems && (
                                                        <div className="ml-4 pl-3 border-l border-border/50 space-y-1">
                                                            {configItem.subItems.map(child => {
                                                                const ChildIcon = child.icon;
                                                                return (
                                                                    <Button
                                                                        key={child.id}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className={cn(
                                                                            "w-full justify-start gap-3",
                                                                            isActive(child.path) && "bg-secondary"
                                                                        )}
                                                                        onClick={() => handleMobileNavigate(child.path)}
                                                                    >
                                                                        <ChildIcon className="h-3 w-3" />
                                                                        <span>{child.label}</span>
                                                                    </Button>
                                                                );
                                                            })}

                                                            {/* Version Item */}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full justify-start gap-3 text-muted-foreground"
                                                                onClick={() => handleMobileNavigate('/configuration?tab=changelog')}
                                                            >
                                                                <Info className="h-3 w-3" />
                                                                <span>Versión v{changelog[0]?.version || '0.0.0'}</span>
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <SheetFooter className="mt-auto pt-6 border-t flex flex-col gap-4">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={cycleTheme}>
                                    {getThemeIcon()}
                                    {getThemeLabel()}
                                </Button>
                            </div>
                            <div className="w-full flex items-center gap-3">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="h-9 w-9 rounded-full" />
                                ) : (
                                    <div className="h-9 w-9 bg-muted rounded-full flex items-center justify-center">
                                        <User className="h-5 w-5" />
                                    </div>
                                )}
                                <div className="flex flex-col text-sm flex-1">
                                    <span className="font-medium">{user?.displayName?.split(' ')[0]}</span>
                                    <span className="text-xs text-muted-foreground cursor-pointer hover:underline" onClick={handleSignOut}>Cerrar Sesión</span>
                                </div>
                                <ConnectionStatus onClick={() => setStatusDialogOpen(true)} />
                            </div>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                {/* Logo (Visible on Mobile & Desktop) */}
                <div
                    className="flex items-center gap-1 md:gap-2 font-semibold md:text-lg cursor-pointer flex-1 md:flex-none min-w-0"
                    onClick={() => navigate(selectedEntityId ? '/dashboard' : '/entity-selection')}
                >
                    <img src={numiaLogo} alt="Numia" className="h-6 md:h-8 flex-shrink-0 object-contain" />
                </div>

                {/* Quick Actions & Entity Switcher (Desktop) */}
                <div className="hidden md:flex items-center gap-2 ml-4">
                    <EntitySelector />
                    <QuickActions onAction={onQuickAction} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "text-header-foreground hover:text-header-foreground hover:bg-slate-700/50",
                            isOpen && "bg-secondary/50"
                        )}
                        onClick={handleAssistantToggle}
                        title="Asistente AI"
                    >
                        <Bot className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1" />

                {/* Creating Entity Dialog */}
                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Nueva Entidad</DialogTitle>
                        </DialogHeader>
                        <EntityForm onSuccess={() => setOpenCreate(false)} />
                    </DialogContent>
                </Dialog>

                {/* Connection Status Detail Dialog */}
                <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Estado de Conexión</DialogTitle>
                        </DialogHeader>
                        <ConnectionStatusDetail />
                    </DialogContent>
                </Dialog>

                {/* Right Side Actions */}
                <div className="flex items-center gap-1 md:gap-2">
                    {/* Mobile Assistant Button - Right Side */}
                    <div className="md:hidden flex items-center">
                        <Button
                            variant="ghost"
                            className={cn("bg-transparent hover:bg-secondary/20 p-0 h-10 w-10 flex items-center justify-center rounded-full active:bg-white/10", theme === 'cloudy' && "text-white")}
                            onClick={handleAssistantToggle}
                        >
                            <Bot className="h-9 w-9" />
                        </Button>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hidden md:flex text-header-foreground">
                                {theme === 'light' ? <Sun className="h-5 w-5" /> : theme === 'dark' ? <Moon className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
                                <span className="sr-only">Seleccionar tema</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2 cursor-pointer">
                                <Sun className="h-4 w-4" />
                                <span>Modo Claro</span>
                                {theme === 'light' && <Check className="h-4 w-4 ml-auto" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2 cursor-pointer">
                                <Moon className="h-4 w-4" />
                                <span>Modo Oscuro</span>
                                {theme === 'dark' && <Check className="h-4 w-4 ml-auto" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme('cloudy')} className="gap-2 cursor-pointer">
                                <Cloud className="h-4 w-4" />
                                <span>Modo Nublado</span>
                                {theme === 'cloudy' && <Check className="h-4 w-4 ml-auto" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Notification Dropdown wrapper to override button styles */}
                    <div className="flex items-center justify-center">
                        <NotificationDropdown onOpenSettings={() => navigate('/notifications')} iconClassName="h-9 w-9" />
                    </div>

                    <div className="pl-1">
                        <UserMenu />
                    </div>
                </div>
            </div>
        </header>
    );
}
