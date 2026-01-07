import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, CalendarClock } from 'lucide-react';
import type { EntitySubscription } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SubscriptionListProps {
    entityId: string;
    onEdit: (subscription: EntitySubscription) => void;
}

export function SubscriptionList({ entityId, onEdit }: SubscriptionListProps) {
    const { entitySubscriptions, deleteEntitySubscription, categories } = useData();

    // Filter by entity
    const subscriptions = entitySubscriptions.filter(s => s.entityId === entityId);

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta suscripción?')) {
            await deleteEntitySubscription(id);
        }
    };

    const getCategoryColor = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        return cat?.color || '#9ca3af';
    };

    const getCategoryName = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        return cat?.name || 'Sin categoría';
    };

    if (subscriptions.length === 0) {
        return (
            <div className="text-center py-10 opacity-60">
                <CalendarClock className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No hay suscripciones activas</h3>
                <p className="text-sm text-muted-foreground">Agrega tus servicios recurrentes para controlarlos aquí.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Frecuencia</TableHead>
                        <TableHead>Próximo Pago</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Caja</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{sub.name}</span>
                                    {sub.description && (
                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {sub.description}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="font-bold">
                                    {sub.currency} ${sub.amount.toLocaleString()}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                    {sub.billingCycle === 'yearly' ? 'Anual' : 'Mensual'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {format(new Date(sub.nextPaymentDate), 'dd MMM yyyy', { locale: es })}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: getCategoryColor(sub.categoryId) }}
                                    />
                                    <span className="text-sm">{getCategoryName(sub.categoryId)}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {sub.box}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Abrir menú</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onEdit(sub)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleDelete(sub.id)}
                                            className="text-red-600 focus:text-red-600"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
