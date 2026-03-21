import { FileText, Upload } from 'lucide-react';

export function ServiceDocumentsTab() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/5">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center">
                        <FileText className="h-7 w-7 opacity-50" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground text-base">Documentos</h3>
                        <p className="text-sm mt-1 max-w-xs mx-auto">
                            Próximamente podrás adjuntar contratos, propuestas y otros archivos al servicio.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground/60">
                        <Upload className="h-3.5 w-3.5" />
                        <span>PDF, Imágenes, Documentos</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
