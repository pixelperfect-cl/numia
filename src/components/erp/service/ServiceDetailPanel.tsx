import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import type { EnhancedSubscription } from '@/types';
import { ServiceGeneralTab } from './tabs/ServiceGeneralTab';
import { ServiceFinanceTab } from './tabs/ServiceFinanceTab';
import { ServiceChecklistTab } from './tabs/ServiceChecklistTab';
import { ServiceNotesTab } from './tabs/ServiceNotesTab';
import { ServiceDocumentsTab } from './tabs/ServiceDocumentsTab';
import {
    LayoutDashboard, Wallet, ListChecks, StickyNote, FileText, Globe
} from 'lucide-react';

interface ServiceDetailPanelProps {
    subscription: EnhancedSubscription | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ufValue: number | null;
    onEdit: (sub: EnhancedSubscription) => void;
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
    onViewClient: (sub: EnhancedSubscription) => void;
    onMarkPaid: (sub: EnhancedSubscription) => void;
    onPartialPayment: (sub: EnhancedSubscription) => void;
    onRevertPayment: (sub: EnhancedSubscription) => void;
    onDeletePayment?: (paymentId: string) => Promise<void>;
    onEditPayment?: (payment: any) => void;
    onRefresh: () => void;
    onUpdateSubscription: (updated: EnhancedSubscription) => void;
}

const tabs = [
    { id: 'general', label: 'General', icon: LayoutDashboard },
    { id: 'finance', label: 'Finanzas', icon: Wallet },
    { id: 'checklists', label: 'Checklists', icon: ListChecks },
    { id: 'notes', label: 'Notas', icon: StickyNote },
    { id: 'documents', label: 'Documentos', icon: FileText },
];

export function ServiceDetailPanel({
    subscription,
    open,
    onOpenChange,
    ufValue,
    onEdit,
    onArchive,
    onDelete,
    onViewClient,
    onMarkPaid,
    onPartialPayment,
    onRevertPayment,
    onDeletePayment,
    onEditPayment,
    onRefresh,
    onUpdateSubscription,
}: ServiceDetailPanelProps) {
    const [activeTab, setActiveTab] = useState('general');

    if (!subscription) return null;

    const getLabelColor = (name: string) => {
        const colors = [
            'bg-emerald-500',
            'bg-blue-500',
            'bg-purple-500',
            'bg-rose-500',
            'bg-amber-500',
            'bg-cyan-500'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[540px] p-0 flex flex-col"
            >
                {/* Header */}
                <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <SheetHeader className="p-5 pb-3">
                        <div className="flex items-center gap-3 pr-8">
                            <div className={cn("h-1.5 w-6 rounded-full", getLabelColor(subscription.name))} />
                            <div className="flex-1 min-w-0">
                                <SheetTitle className="text-lg truncate">
                                    {subscription.clientName}
                                </SheetTitle>
                                <SheetDescription className="flex items-center gap-2 mt-0.5">
                                    <span className="truncate">{subscription.name}</span>
                                    {subscription.clientWebsite && (
                                        <>
                                            <span className="text-muted-foreground/30">•</span>
                                            <a
                                                href={subscription.clientWebsite.startsWith('http') ? subscription.clientWebsite : `https://${subscription.clientWebsite}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                            >
                                                <Globe className="h-3 w-3" />
                                                <span className="truncate max-w-[120px]">
                                                    {subscription.clientWebsite.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                                                </span>
                                            </a>
                                        </>
                                    )}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="px-5">
                            <TabsList className="w-full h-9 bg-muted/50 p-0.5">
                                {tabs.map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <TabsTrigger
                                            key={tab.id}
                                            value={tab.id}
                                            className="flex-1 h-8 text-xs gap-1.5 data-[state=active]:shadow-sm"
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </div>
                    </Tabs>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsContent value="general" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                            <ServiceGeneralTab
                                subscription={subscription}
                                ufValue={ufValue}
                                onEdit={() => {
                                    onOpenChange(false);
                                    onEdit(subscription);
                                }}
                                onArchive={() => {
                                    onOpenChange(false);
                                    onArchive(subscription.id);
                                }}
                                onDelete={() => {
                                    onOpenChange(false);
                                    onDelete(subscription.id);
                                }}
                                onViewClient={() => {
                                    onOpenChange(false);
                                    onViewClient(subscription);
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="finance" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                            <ServiceFinanceTab
                                subscription={subscription}
                                ufValue={ufValue}
                                onMarkPaid={() => {
                                    onOpenChange(false);
                                    onMarkPaid(subscription);
                                }}
                                onPartialPayment={() => {
                                    onOpenChange(false);
                                    onPartialPayment(subscription);
                                }}
                                onRevertPayment={() => {
                                    onOpenChange(false);
                                    onRevertPayment(subscription);
                                }}
                                onDeletePayment={onDeletePayment}
                                onEditPayment={onEditPayment}
                            />
                        </TabsContent>

                        <TabsContent value="checklists" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                            <ServiceChecklistTab
                                subscription={subscription}
                                onUpdate={onUpdateSubscription}
                            />
                        </TabsContent>

                        <TabsContent value="notes" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                            <ServiceNotesTab
                                subscription={subscription}
                                onUpdate={onUpdateSubscription}
                            />
                        </TabsContent>

                        <TabsContent value="documents" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                            <ServiceDocumentsTab />
                        </TabsContent>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    );
}
