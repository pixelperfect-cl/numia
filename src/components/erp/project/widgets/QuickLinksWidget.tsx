import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Github, Figma, Globe, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkItem {
    title: string;
    url: string;
    type: 'github' | 'figma' | 'url';
}

interface QuickLinksWidgetProps {
    links?: LinkItem[];
}

export function QuickLinksWidget({ links = [] }: QuickLinksWidgetProps) {
    // Default links if none provided (for demo/mock purposes)
    const displayLinks: LinkItem[] = links; // No mock data!

    const getIcon = (type: string) => {
        switch (type) {
            case 'github': return <Github className="h-4 w-4" />;
            case 'figma': return <Figma className="h-4 w-4" />;
            default: return <Globe className="h-4 w-4" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'github': return "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100";
            case 'figma': return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300";
            default: return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300";
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    Enlaces Rápidos
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                {displayLinks.map((link, i) => (
                    <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group border border-transparent hover:border-border/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-md", getBgColor(link.type))}>
                                {getIcon(link.type)}
                            </div>
                            <span className="text-sm font-medium">{link.title}</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                ))}
            </CardContent>
        </Card>
    );
}
