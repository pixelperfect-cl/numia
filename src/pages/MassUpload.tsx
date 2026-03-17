import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BulkUploadWizard } from '@/components/movements/BulkUploadWizard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface MassUploadProps {
    onBack: () => void;
    initialEntityId: string | null;
}

export function MassUpload({ initialEntityId }: MassUploadProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/movements');
    };

    return (
        <div className="h-[calc(100vh-4rem)] p-6 bg-background space-y-6 flex flex-col">
            <div className="flex items-center gap-4 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Carga Masiva de Movimientos</h1>
                    <p className="text-muted-foreground">Importa movimientos desde tu cartola bancaria.</p>
                </div>
            </div>

            <div className="flex-1 border rounded-xl shadow-sm bg-card overflow-hidden">
                <BulkUploadWizard
                    onClose={handleBack}
                    onSaveSuccess={handleBack}
                    initialEntityId={initialEntityId || undefined}
                />
            </div>
        </div>
    );
}
