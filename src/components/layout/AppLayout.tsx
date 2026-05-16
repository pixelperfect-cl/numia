import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { QuickActions } from '@/components/layout/QuickActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccountSettings } from '@/components/configuration/AccountSettings';
import { ConfigSidebar } from '@/components/configuration/ConfigSidebar';
import { TransferDialog } from '@/components/TransferDialog';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { ClientDialog } from '@/components/erp/ClientDialog';
import { ProjectDialog } from '@/components/erp/ProjectDialog';
import { ServiceDialog } from '@/components/erp/ServiceDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAI } from '@/contexts/AIContext';
import { FullScreenQuickActions } from '@/components/layout/FullScreenQuickActions';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
    selectedEntityId: string;
    onEntityChange: (id: string) => void;
}

export function AppLayout({ selectedEntityId, onEntityChange }: AppLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isOpen } = useAI();
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const mainRef = useRef<HTMLDivElement>(null);

    // Scroll to top on route change
    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
    }, [location.pathname]);

    // Dialog Open States
    const [openAccountDialog, setOpenAccountDialog] = useState(false);
    const [openTransferDialog, setOpenTransferDialog] = useState(false);
    const [showFullScreenActions, setShowFullScreenActions] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // ERP Dialog States
    const [openClientDialog, setOpenClientDialog] = useState(false);
    const [openProjectDialog, setOpenProjectDialog] = useState(false);
    const [openServiceDialog, setOpenServiceDialog] = useState(false);

    // Gesture Listener for Two-Finger Swipe
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                touchStart.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (touchStart.current && e.touches.length === 2) {
                const currentX = e.touches[0].clientX;
                const currentY = e.touches[0].clientY;

                const deltaX = currentX - touchStart.current.x;
                const deltaY = currentY - touchStart.current.y;

                // Check if movement is primarily horizontal
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Right to Left Swipe (Opening Quick Actions)
                    // We want this gesture to be RIGHT to LEFT (< -100)
                    if (deltaX < -70) {
                        setShowFullScreenActions(true);
                        touchStart.current = null;
                        return;
                    }

                    // Left to Right Swipe (Opening Mobile Menu)
                    // We want this gesture to be LEFT to RIGHT (> 100)
                    if (deltaX > 70) {
                        setMobileMenuOpen(true);
                        touchStart.current = null;
                        return;
                    }
                }
            }
        };

        const handleTouchEnd = () => {
            touchStart.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'movement':
                navigate('/movements?action=create');
                break;
            case 'mass-upload':
                navigate('/mass-upload');
                break;
            case 'loan':
                navigate('/loans?action=create');
                break;
            case 'projection':
                navigate('/projections?action=create');
                break;
            case 'subscription':
                navigate('/subscriptions');
                break;
            case 'transfer':
                setOpenTransferDialog(true);
                break;
            case 'client':
                setOpenClientDialog(true);
                break;
            case 'service-assign':
                setOpenServiceDialog(true);
                break;
            case 'project':
                setOpenProjectDialog(true);
                break;
            case 'account-settings':
                setOpenAccountDialog(true);
                break;
        }
    };

    return (
        <div className="bg-background font-sans antialiased flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
            <Header
                selectedEntityId={selectedEntityId}
                onEntityChange={onEntityChange}
                onQuickAction={handleQuickAction}
                mobileMenuOpen={mobileMenuOpen}
                onMobileMenuOpenChange={setMobileMenuOpen}
            />

            <div className="flex flex-1 min-h-0 overflow-hidden">
                <Sidebar
                    selectedEntityId={selectedEntityId}
                />

                {location.pathname === '/configuration' && <ConfigSidebar />}

                <main ref={mainRef} className="flex-1 overflow-y-auto bg-muted/10 no-scrollbar">
                    <div className={cn(
                        "mx-auto max-w-screen-2xl space-y-6 p-4 pb-14 md:p-6 lg:p-8",
                        location.pathname.includes('/projects/') ? "pt-0 md:pt-0 lg:pt-0" : "pt-4 md:pt-6 lg:pt-8"
                    )}>
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Outlet />
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

            {/* ERP Quick Action Dialogs */}
            <ClientDialog
                open={openClientDialog}
                onOpenChange={setOpenClientDialog}
                onSuccess={() => setOpenClientDialog(false)}
                entityId={selectedEntityId || undefined}
            />

            <ServiceDialog
                open={openServiceDialog}
                onOpenChange={setOpenServiceDialog}
                onSuccess={() => setOpenServiceDialog(false)}
                entityId={selectedEntityId || undefined}
            />

            <ProjectDialog
                open={openProjectDialog}
                onOpenChange={setOpenProjectDialog}
                onSuccess={() => setOpenProjectDialog(false)}
                entityId={selectedEntityId || undefined}
            />

            <TransferDialog open={openTransferDialog} onOpenChange={setOpenTransferDialog} />

            {/* Full Screen Quick Actions */}
            <FullScreenQuickActions
                isOpen={showFullScreenActions}
                onClose={() => setShowFullScreenActions(false)}
                onAction={handleQuickAction}
            />

            {/* AI Assistant */}
            <AIAssistant />

            {/* Mobile Quick Actions FAB */}
            {!isOpen && (
                <div className="fixed bottom-12 right-4 z-40 md:hidden">
                    <QuickActions
                        onAction={handleQuickAction}
                        isMobile={true}
                        align="end"
                        side="top"
                        trigger={
                            <Button
                                className="h-12 w-12 rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-800 text-white p-0 flex items-center justify-center transition-all"
                            >
                                <Plus className="h-6 w-6" />
                            </Button>
                        }
                    />
                </div>
            )}
        </div>
    );
}
