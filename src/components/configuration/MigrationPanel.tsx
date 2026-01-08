import { useMigration } from '@/hooks/useMigration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, Database, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function MigrationPanel() {
    const { state, progress, logs, startMigration } = useMigration();

    return (
        <Card className="border-orange-500/20 bg-orange-500/5">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-orange-500" />
                    <CardTitle>Migración Histórica a Supabase</CardTitle>
                </div>
                <CardDescription>
                    Esta herramienta copiará todos los datos existentes en Firebase a la nueva base de datos en Supabase.
                    Úsalo solo una vez para importar tu historial.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {state === 'idle' && (
                    <Alert variant="warning" className="bg-orange-500/10 border-orange-500/20 text-orange-600">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Advertencia</AlertTitle>
                        <AlertDescription>
                            Este proceso puede tardar varios minutos. No cierres esta ventana hasta que finalice.
                        </AlertDescription>
                    </Alert>
                )}

                {state !== 'idle' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Progreso General</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}

                <div className="rounded-md border bg-muted/50 p-4">
                    <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Registro de Actividad
                    </div>
                    <ScrollArea className="h-[150px] w-full pr-4">
                        <div className="space-y-1 text-xs font-mono">
                            {logs.length === 0 ? (
                                <span className="text-muted-foreground italic">Esperando inicio...</span>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="text-foreground/80 border-l-2 border-transparent pl-2 hover:border-primary/50">
                                        {log}
                                    </div>
                                ))
                            )}
                            {state === 'completed' && (
                                <div className="text-green-600 font-bold flex items-center gap-1 mt-2">
                                    <CheckCircle2 className="h-3 w-3" /> Migración Finalizada con Éxito
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    onClick={startMigration}
                    disabled={state === 'running' || state === 'completed'}
                    className="w-full sm:w-auto"
                    variant={state === 'completed' ? "secondary" : "default"}
                >
                    {state === 'running' ? (
                        <>
                            <UploadCloud className="mr-2 h-4 w-4 animate-bounce" />
                            Migrando Datos...
                        </>
                    ) : state === 'completed' ? (
                        <>Migración Completada</>
                    ) : (
                        <>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            Iniciar Migración Completa
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
