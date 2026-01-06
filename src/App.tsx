/**
 * Numia v1.0 - Main App Component
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import numiaLogo from '@/assets/numialogo.png';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Entities } from '@/pages/Entities';
import { EntityPanel } from '@/pages/EntityPanel';
import { Movements } from '@/pages/Movements';
import { Loans } from '@/pages/Loans';
import { Projections } from '@/pages/Projections';
import { Configuration } from '@/pages/Configuration';
import { MassUpload } from '@/pages/MassUpload';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Button } from '@/components/ui/button';
import { Sidebar, MobileMenu } from '@/components/layout/Sidebar';
import { useTheme } from '@/components/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccountSettings } from '@/components/configuration/AccountSettings';
import { TransferDialog } from '@/components/TransferDialog';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { AIAssistantButton } from '@/components/ai/AIAssistantButton';
import { User, Settings as SettingsIcon, LogOut, Sun, Moon, Plus, ArrowLeftRight, Wallet, TrendingUp, ArrowRightLeft, Upload } from 'lucide-react';

function App() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [openMovementDialog, setOpenMovementDialog] = useState(false);
  const [openLoanDialog, setOpenLoanDialog] = useState(false);
  const [openProjectionDialog, setOpenProjectionDialog] = useState(false);
  const [openEntityMovementDialog, setOpenEntityMovementDialog] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleEntitySelect = (entityId: string) => {
    setSelectedEntityId(entityId);
    setCurrentPage('entity-panel');
  };

  const handleBackToEntities = () => {
    setSelectedEntityId(null);
    setCurrentPage('entities');
  };

  const handleQuickAction = (action: 'movement' | 'loan' | 'projection' | 'transfer' | 'mass-upload') => {
    switch (action) {
      case 'movement':
        // Si estamos en el panel de entidad, abrir el dialog ahí mismo
        if (currentPage === 'entity-panel' && selectedEntityId) {
          setOpenEntityMovementDialog(true);
        } else {
          setCurrentPage('movements');
          setOpenMovementDialog(true);
        }
        break;
      case 'mass-upload':
        // For mass upload we want to navigate to the page. 
        // If we have an entity selected, pass it along via state if we could, but here we set page.
        setCurrentPage('mass-upload');
        break;
      case 'loan':
        setCurrentPage('loans');
        setOpenLoanDialog(true);
        break;
      case 'projection':
        setCurrentPage('projections');
        setOpenProjectionDialog(true);
        break;
      case 'transfer':
        setOpenTransferDialog(true);
        break;
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'entities':
        return <Entities onEntitySelect={handleEntitySelect} />;
      case 'entity-panel':
        return selectedEntityId ? (
          <EntityPanel
            entityId={selectedEntityId}
            onBack={handleBackToEntities}
            openMovementDialog={openEntityMovementDialog}
            onMovementDialogClose={() => setOpenEntityMovementDialog(false)}
          />
        ) : (
          <Entities onEntitySelect={handleEntitySelect} />
        );
      case 'movements':
        return <Movements openDialog={openMovementDialog} onDialogClose={() => setOpenMovementDialog(false)} />;
      case 'loans':
        return <Loans openDialog={openLoanDialog} onDialogClose={() => setOpenLoanDialog(false)} />;
      case 'projections':
        return <Projections openDialog={openProjectionDialog} onDialogClose={() => setOpenProjectionDialog(false)} />;
      case 'configuration':
        return <Configuration />;
      case 'mass-upload':
        return <MassUpload onBack={() => setCurrentPage(selectedEntityId ? 'entity-panel' : 'dashboard')} initialEntityId={selectedEntityId} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onEntitySelect={handleEntitySelect}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-card">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <MobileMenu
                currentPage={currentPage}
                onNavigate={setCurrentPage}
                onEntitySelect={handleEntitySelect}
              />
              <div className="flex items-center gap-3">
                <img
                  src={numiaLogo}
                  alt="Numia"
                  className="h-4 sm:h-6 w-auto cursor-pointer"
                  onClick={() => setCurrentPage('dashboard')}
                />
                {/* Quick Action Button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-border/40 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Crear nuevo</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer gap-3" onClick={() => handleQuickAction('movement')}>
                      <ArrowLeftRight className="h-4 w-4" />
                      <span>Movimiento</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-3" onClick={() => handleQuickAction('transfer')}>
                      <ArrowRightLeft className="h-4 w-4" />
                      <span>Transferencia</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-3" onClick={() => handleQuickAction('loan')}>
                      <Wallet className="h-4 w-4" />
                      <span>Préstamo</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-3" onClick={() => handleQuickAction('projection')}>
                      <TrendingUp className="h-4 w-4" />
                      <span>Proyección</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer gap-3" onClick={() => handleQuickAction('mass-upload')}>
                      <Upload className="h-4 w-4" />
                      <span>Carga Masiva</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <NotificationDropdown onOpenSettings={() => setCurrentPage('configuration')} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    {user.photoURL && (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="h-6 w-6 rounded-full" />
                    )}
                    <span className="hidden sm:inline text-sm">{user.displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setOpenAccountDialog(true)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Configuración de Cuenta</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setCurrentPage('configuration')}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {renderPage()}
        </main>
      </div>

      {/* Account Settings Dialog */}
      <Dialog open={openAccountDialog} onOpenChange={setOpenAccountDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración de Cuenta</DialogTitle>
          </DialogHeader>
          <AccountSettings />
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <TransferDialog open={openTransferDialog} onOpenChange={setOpenTransferDialog} />



      {/* AI Assistant */}
      <AIAssistant />
      <AIAssistantButton />
    </div>
  );
}

export default App;
