import { useState } from 'react';
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
import { User, LogOut, Sun, Moon, ChevronsUpDown, Check, Settings, Plus, Menu, X, ArrowLeftRight, Wallet, TrendingUp, ArrowRightLeft, Repeat, Bot } from 'lucide-react';
import { useAI } from '@/contexts/AIContext';
import { useData } from '@/contexts/DataContext';
import { IconComponent } from '@/components/IconPicker';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { EntityForm } from '@/components/EntityForm';
import numiaLogo from '@/assets/numialogo.png';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { menuItems } from './Sidebar';
import { NotificationDropdown } from '@/components/NotificationDropdown';

interface HeaderProps {
    selectedEntityId: string;
    onEntityChange: (entityId: string) => void;
    onNavigate: (page: string) => void;
    onQuickAction: (action: 'movement' | 'loan' | 'projection' | 'transfer' | 'mass-upload' | 'subscription') => void;
}

function QuickActionsDropdown({ onAction, isMobile = false }: { onAction: HeaderProps['onQuickAction'], isMobile?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    // Mobile: Standard Click behavior (uncontrolled or simple controlled)
    // Desktop: Hover + Click interactions

    // Wrapper to handle interactions
    const InteractionWrapper = ({ children }: { children: React.ReactNode }) => {
        if (isMobile) return <>{children}</>;

        return (
            <div
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                {children}
            </div>
        );
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <InteractionWrapper>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Crear nuevo"
                        className="bg-secondary/50 hover:bg-secondary data-[state=open]:bg-secondary transition-colors"
                        onClick={() => { if (isMobile) setIsOpen(!isOpen) }}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="center"
                    className="w-56"
                    onCloseAutoFocus={(e) => !isMobile && e.preventDefault()}
                >
                    <DropdownMenuLabel>Crear nuevo</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => onAction('movement')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <ArrowLeftRight className="mr-2 h-4 w-4" /> Movimiento
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onAction('transfer')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferencia
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onAction('loan')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <Wallet className="mr-2 h-4 w-4" /> Préstamo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onAction('projection')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <TrendingUp className="mr-2 h-4 w-4" /> Proyección
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onAction('subscription')}
                        className="cursor-pointer focus:bg-secondary focus:text-secondary-foreground"
                    >
                        <Repeat className="mr-2 h-4 w-4" /> Suscripción
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </InteractionWrapper>
        </DropdownMenu>
    );
}

export function Header({ selectedEntityId, onEntityChange, onNavigate, onQuickAction }: HeaderProps) {
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const { entities } = useData();
    const [openCreate, setOpenCreate] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const { isOpen, openAssistant, closeAssistant } = useAI();

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

    const handleMobileNavigate = (page: string) => {
        onNavigate(page);
        setSheetOpen(false);
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
                <DropdownMenuItem onSelect={() => onNavigate('entity-selection')} className="cursor-pointer text-muted-foreground focus:text-primary">
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
                <DropdownMenuItem onClick={() => onNavigate('account-settings')}>Configuración Cuenta</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500 hover:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
            {/* Mobile Menu (Hamburger) */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
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
                                // Skip if ERP not enabled
                                if (item.erpRequired && !erpEnabled) return null;

                                // Simple render logic for mobile (flattening groups for simplicity or keeping them simple)
                                return (
                                    <Button
                                        key={item.id}
                                        variant="ghost"
                                        className="justify-start gap-3"
                                        onClick={() => handleMobileNavigate(item.id)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label.replace('ERP: ', '')}
                                    </Button>
                                )
                            })}
                        </div>
                    </div>

                    <SheetFooter className="mt-auto pt-6 border-t flex flex-col gap-4">
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                                {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
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
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Logo (Visible on Mobile & Desktop) */}
            <div
                className="flex items-center gap-2 font-semibold md:text-lg cursor-pointer"
                onClick={() => onNavigate(selectedEntityId ? 'entity-panel' : 'entity-selection')}
            >
                <img src={numiaLogo} alt="Numia" className="h-8" />
                <div className="md:hidden flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <QuickActionsDropdown onAction={onQuickAction} isMobile={true} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`text-muted-foreground hover:text-primary ${isOpen ? 'text-primary bg-primary/10' : ''}`}
                        onClick={handleAssistantToggle}
                    >
                        <Bot className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Quick Actions & Entity Switcher (Desktop) */}
            <div className="hidden md:flex items-center gap-2 ml-4">
                <EntitySelector />
                <QuickActionsDropdown onAction={onQuickAction} />
                <Button
                    variant="ghost"
                    size="icon"
                    className={`text-muted-foreground hover:text-primary ${isOpen ? 'text-primary bg-primary/10' : ''}`}
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

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    <span className="sr-only">Toggle theme</span>
                </Button>
                <NotificationDropdown onOpenSettings={() => onNavigate('configuration')} />
                <UserMenu />
            </div>
        </header>
    );
}
