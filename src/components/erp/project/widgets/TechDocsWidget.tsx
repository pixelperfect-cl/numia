import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Book, FileCode, Database, ArrowUpRight } from "lucide-react";

export function TechDocsWidget() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Book className="h-4 w-4 text-muted-foreground" />
                    Documentación Técnica
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                <a href="#" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 text-orange-500 rounded-md">
                            <FileCode className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-sm font-medium">API Documentation</div>
                            <div className="text-xs text-muted-foreground">Swagger / OpenAPI</div>
                        </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>

                <a href="#" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-md">
                            <Database className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-sm font-medium">Database Schema</div>
                            <div className="text-xs text-muted-foreground">ERD & Migrations</div>
                        </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            </CardContent>
        </Card>
    );
}
