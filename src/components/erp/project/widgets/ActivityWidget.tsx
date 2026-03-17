import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Clock, Send, User as UserIcon, CheckCircle2, AlertCircle, DollarSign, FileText, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { logProjectActivity, ActivityLog, getProjectActivities } from "@/lib/activityUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ActivityWidgetProps {
    projectId: string;
    hideComments?: boolean;
    className?: string;
}

export function ActivityWidget({ projectId, hideComments, className }: ActivityWidgetProps) {
    const { user } = useAuth();
    const [comment, setComment] = useState("");
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    const loadActivities = async () => {
        if (!projectId) return;
        try {
            const data = await getProjectActivities(projectId);
            setActivities(data);
        } catch (error) {
            console.error("Failed to load activities", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActivities();
    }, [projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim() || !user) return;

        const text = comment;
        setComment(""); // Optimistic clear

        await logProjectActivity(
            projectId,
            'comment',
            text,
            user.uid,
            user.displayName || user.email?.split('@')[0] || 'Usuario'
        );

        // Refresh list
        loadActivities();
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'comment': return <MessageSquare className="h-4 w-4 text-blue-500" />;
            case 'milestone_completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'payment_registered': return <DollarSign className="h-4 w-4 text-yellow-500" />;
            case 'status_change': return <AlertCircle className="h-4 w-4 text-orange-500" />;
            case 'description_update': return <FileText className="h-4 w-4 text-purple-500" />;
            default: return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const comments = activities.filter(a => a.type === 'comment');
    const history = activities.filter(a => a.type !== 'comment');

    const ActivityItem = ({ item }: { item: ActivityLog }) => (
        <div className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mt-1">
                {item.type === 'comment' ? (
                    <Avatar className="h-8 w-8 border">
                        <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100">
                            {item.userName ? item.userName.substring(0, 2).toUpperCase() : <UserIcon className="h-4 w-4" />}
                        </AvatarFallback>
                    </Avatar>
                ) : (
                    <div className="h-8 w-8 rounded-full border flex items-center justify-center bg-muted/50">
                        {getActivityIcon(item.type)}
                    </div>
                )}
            </div>

            <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold leading-none flex items-center gap-2">
                        {item.userName || 'Sistema'}
                        {item.type !== 'comment' && (
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                                {item.type.replace('_', ' ')}
                            </span>
                        )}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                        {item.createdAt ? format(new Date(item.createdAt), "d MMM, HH:mm", { locale: es }) : 'Reciente'}
                    </span>
                </div>
                <div className="text-sm text-foreground/90 leading-relaxed text-balance">
                    {item.type === 'comment' ? (
                        item.message
                    ) : (
                        <span className="text-muted-foreground">{item.message}</span>
                    )}
                </div>
            </div>
        </div>
    );

    if (hideComments) {
        return (
            <Card className={cn("flex flex-col h-[500px] overflow-hidden border-none shadow-none bg-muted/20", className)}>
                <CardContent className="p-0 flex-1 min-h-0 relative">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">
                            {loading ? (
                                <p className="text-xs text-muted-foreground text-center">Cargando actividad...</p>
                            ) : history.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center italic">No hay actividad reciente.</p>
                            ) : (
                                history.map((item) => <ActivityItem key={item.id} item={item} />)
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("flex flex-col h-[500px] overflow-hidden", className)}>
            <Tabs defaultValue="comments" className="flex flex-col h-full w-full">
                <div className="border-b px-4 bg-muted/20">
                    <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-6">
                        <TabsTrigger
                            value="comments"
                            className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-medium"
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Comentarios
                        </TabsTrigger>
                        <TabsTrigger
                            value="activity"
                            className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-medium"
                        >
                            <Activity className="mr-2 h-4 w-4" />
                            Actividad
                        </TabsTrigger>
                    </TabsList>
                </div>

                <CardContent className="p-0 flex-1 min-h-0 relative">
                    <TabsContent value="comments" className="h-full flex flex-col m-0 border-none p-0 absolute inset-0">
                        <div className="p-3 border-b bg-muted/30 shrink-0">
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <Textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Escribe un comentario..."
                                    className="min-h-[40px] h-[40px] resize-none py-2 text-xs focus-visible:ring-1"
                                />
                                <Button size="icon" className="h-10 w-10 shrink-0" type="submit" disabled={!comment.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-6">
                                {loading ? (
                                    <p className="text-xs text-muted-foreground text-center">Cargando comentarios...</p>
                                ) : comments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center italic">No hay comentarios aún.</p>
                                ) : (
                                    comments.map((item) => <ActivityItem key={item.id} item={item} />)
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="activity" className="h-full flex flex-col m-0 border-none p-0 absolute inset-0">
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-6">
                                {loading ? (
                                    <p className="text-xs text-muted-foreground text-center">Cargando actividad...</p>
                                ) : history.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center italic">No hay actividad reciente.</p>
                                ) : (
                                    history.map((item) => <ActivityItem key={item.id} item={item} />)
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
}
