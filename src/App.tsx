/**
 * Numia v1.0 - Main App Component
 */

import { useState, useEffect } from 'react';
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
import { Subscriptions } from '@/pages/Subscriptions';
import { Services } from '@/pages/erp/Services';
import { Clients } from '@/pages/erp/Clients';
import { Projects } from '@/pages/erp/Projects';
import { ERPDashboard } from '@/pages/erp/ERPDashboard';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { EntitySelection } from '@/pages/EntitySelection';
import { EntityConfiguration } from '@/pages/EntityConfiguration';
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

import { User, Settings as SettingsIcon, LogOut, Sun, Moon, Plus, ArrowLeftRight, Wallet, TrendingUp, ArrowRightLeft, Upload } from 'lucide-react';

// ... (keep intervening code if possible, but replace_file_content works on contiguous blocks. 
// Since imports and renderPage are far apart, I should split this into two calls or use multi_replace.
// checking tool definitions... using multi_replace_file_content is better.)

function App() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  // Main State
  const [currentPage, setCurrentPage] = useState('entity-panel'); // Default to panel
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(() => localStorage.getItem('numia-entity-id'));

  // Dialog Open States
  const [openMovementDialog, setOpenMovementDialog] = useState(false);
  const [openLoanDialog, setOpenLoanDialog] = useState(false);
  const [openProjectionDialog, setOpenProjectionDialog] = useState(false);
  const [openEntityMovementDialog, setOpenEntityMovementDialog] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);

  // Persist entity selection
  useEffect(() => {
    if (selectedEntityId) localStorage.setItem('numia-entity-id', selectedEntityId);
    else localStorage.removeItem('numia-entity-id');
  }, [selectedEntityId]);

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

  // New: If logged in but no entity selected, show selection screen
  if (!selectedEntityId) {
    return <EntitySelection onSelect={setSelectedEntityId} />;
  }


  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'movement':
        setCurrentPage('movements');
        setOpenMovementDialog(true);
        break;
      case 'mass-upload':
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
      case 'subscription':
        setCurrentPage('subscriptions');
        break;
      case 'transfer':
        setOpenTransferDialog(true);
        break;
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'entity-panel':
        return <EntityPanel entityId={selectedEntityId} onBack={() => setSelectedEntityId(null)} openMovementDialog={openEntityMovementDialog} onMovementDialogClose={() => setOpenEntityMovementDialog(false)} />;
      case 'movements':
        return <Movements openDialog={openMovementDialog} onDialogClose={() => setOpenMovementDialog(false)} entityId={selectedEntityId || undefined} />;
      case 'loans':
        return <Loans openDialog={openLoanDialog} onDialogClose={() => setOpenLoanDialog(false)} entityId={selectedEntityId || undefined} />;
      case 'projections':
        return <Projections openDialog={openProjectionDialog} onDialogClose={() => setOpenProjectionDialog(false)} entityId={selectedEntityId || undefined} />;
      case 'subscriptions':
        return <Subscriptions entityId={selectedEntityId || ''} />;
      case 'configuration':
        return <EntityConfiguration entityId={selectedEntityId} />;
      case 'entity-configuration':
        return <EntityConfiguration entityId={selectedEntityId} />;
      case 'entity-selection':
        return (
          <EntitySelection
            onSelect={(id) => {
              setSelectedEntityId(id);
              setCurrentPage('entity-panel');
            }}
          />
        );
      case 'mass-upload':
        return <MassUpload onBack={() => setCurrentPage(selectedEntityId ? 'entity-panel' : 'entity-selection')} initialEntityId={selectedEntityId || undefined} />;
      case 'account-settings':
        return <AccountSettings />;

      // ERP Pages
      case 'erp-dashboard':
        return <ERPDashboard />;

      case 'erp-services':
        return <Services entityId={selectedEntityId || undefined} />;
      case 'erp-clients':
        return <Clients entityId={selectedEntityId || undefined} />;
      case 'erp-projects':
        return <Projects entityId={selectedEntityId || undefined} />;

      default:
        return <EntityPanel entityId={selectedEntityId} onBack={() => setSelectedEntityId(null)} />;
    }
  };

  return (
    <div className="h-screen bg-background font-sans antialiased flex flex-col overflow-hidden">
      {/* New Header */}
      <Header
        selectedEntityId={selectedEntityId}
        onEntityChange={(id) => { setSelectedEntityId(id); setCurrentPage('entity-panel'); }}
        onNavigate={setCurrentPage}
        onQuickAction={handleQuickAction}
      />

      <div className="flex flex-1 h-[calc(100vh-4rem)]">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          selectedEntityId={selectedEntityId}
        />

        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6 lg:p-8 no-scrollbar">
          <div className="mx-auto max-w-7xl space-y-6">

            {/* Page Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderPage()}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={openAccountDialog} onOpenChange={setOpenAccountDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración de Cuenta</DialogTitle>
          </DialogHeader>
          <AccountSettings />
        </DialogContent>
      </Dialog>

      <TransferDialog open={openTransferDialog} onOpenChange={setOpenTransferDialog} />

      {/* AI Assistant */}

      <AIAssistant />
    </div>
  );
}

export default App;
