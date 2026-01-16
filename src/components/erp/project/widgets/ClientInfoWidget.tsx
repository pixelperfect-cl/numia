import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Briefcase, Building2, Globe, Mail, Phone, User, Pencil, RefreshCw } from "lucide-react";
import { Client } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ClientSelectionDialog as GlobalClientSelectionDialog } from "@/components/erp/ClientSelectionDialog";

interface ClientInfoWidgetProps {
    client?: Client | null;
    onClientChange?: (newClient: Client) => void;
}

export function ClientInfoWidget({ client, onClientChange }: ClientInfoWidgetProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleClientSelect = (selectedClient: Client) => {
        if (onClientChange) {
            onClientChange(selectedClient);
        }
        setIsDialogOpen(false);
    };

    if (!client) {
        return (
            <Card className="border-dashed bg-muted/30">
                <CardContent className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Sin cliente asignado</p>
                    {onClientChange && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                                Asignar Cliente
                            </Button>
                            <GlobalClientSelectionDialog
                                open={isDialogOpen}
                                onOpenChange={setIsDialogOpen}
                                onSelect={handleClientSelect}
                            />
                        </>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Cliente Asignado
                </CardTitle>
                {onClientChange && (
                    <>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsDialogOpen(true)}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <GlobalClientSelectionDialog
                            open={isDialogOpen}
                            onOpenChange={setIsDialogOpen}
                            onSelect={handleClientSelect}
                        />
                    </>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                        <AvatarFallback>{client.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <p className="font-medium truncate leading-tight">{client.name}</p>
                        {client.website && (
                            <a href={client.website} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary hover:underline truncate block flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {client.website.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                        {/* RUT/ID placeholder if available */}
                        {client.rut && (
                            <p className="text-[10px] text-muted-foreground">ID: {client.rut}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t text-sm">
                    {client.representative && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{client.representative}</span>
                        </div>
                    )}
                    {client.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <a href={`mailto:${client.email}`} className="truncate hover:text-foreground">{client.email}</a>
                        </div>
                    )}
                    {client.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <a href={`tel:${client.phone}`} className="truncate hover:text-foreground">{client.phone}</a>
                        </div>
                    )}
                    {client.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="truncate" title={client.address}>{client.address}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
