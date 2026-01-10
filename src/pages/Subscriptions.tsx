import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SubscriptionList } from '@/components/subscriptions/SubscriptionList';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
import { SubscriptionCharts } from '@/components/subscriptions/SubscriptionCharts';
import type { EntitySubscription } from '@/types';

interface SubscriptionsProps {
    entityId: string;
}

export function Subscriptions({ entityId }: SubscriptionsProps) {
    const [openForm, setOpenForm] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<EntitySubscription | undefined>(undefined);

    const handleCreate = () => {
        setEditingSubscription(undefined);
        setOpenForm(true);
    };

    const handleEdit = (subscription: EntitySubscription) => {
        setEditingSubscription(subscription);
        setOpenForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Gastos</h2>
                    <p className="text-muted-foreground">
                        Gestiona tus servicios recurrentes, suscripciones y gastos fijos.
                    </p>
                </div>
                <Button onClick={handleCreate} size="icon" className="md:w-auto md:px-4 md:py-2">
                    <Plus className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Nuevo Gasto</span>
                </Button>
            </div>

            <SubscriptionCharts entityId={entityId} />

            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Listado de Servicios</h3>
                <SubscriptionList
                    entityId={entityId}
                    onEdit={handleEdit}
                />
            </div>

            <SubscriptionForm
                open={openForm}
                onOpenChange={setOpenForm}
                entityId={entityId}
                subscription={editingSubscription}
            />
        </div>
    );
}
