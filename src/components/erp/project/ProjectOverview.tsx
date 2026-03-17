import { Card, CardContent } from '@/components/ui/card';
import { Project } from '@/types';
import { logProjectActivity } from "@/lib/activityUtils";
import { Button } from '@/components/ui/button';
import { updateProject } from '@/lib/supabase/database';
import { uploadProjectAsset } from '@/lib/supabase/storage';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface ProjectOverviewProps {
    project: Project;
    onUpdate: (updatedProject: Project) => void;
}

export function ProjectOverview({ project, onUpdate }: ProjectOverviewProps) {
    const { user } = useAuth();
    const [description, setDescription] = useState(project.description || '');
    const [isSavingDesc, setIsSavingDesc] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleSaveDescription = async (newDescription?: string) => {
        const contentToSave = newDescription !== undefined ? newDescription : description;
        if (!user || contentToSave === project.description) {
            setIsEditing(false);
            return;
        }

        setIsSavingDesc(true);
        try {
            await updateProject(project.id, { description: contentToSave });
            onUpdate({ ...project, description: contentToSave });

            logProjectActivity(
                project.id,
                'description_update',
                "Descripción del proyecto actualizada",
                user?.uid,
                user?.displayName || user?.email?.split('@')[0]
            );
            setIsEditing(false);

        } catch (error) {
            console.error("Failed to save description", error);
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        try {
            return await uploadProjectAsset(file, project.id);
        } catch (error) {
            console.error("Upload failed", error);
            throw error;
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <h3 className="text-lg font-semibold tracking-tight">Descripción del Proyecto</h3>
                {!isEditing ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                    >
                        Editar
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsEditing(false);
                                setDescription(project.description || '');
                            }}
                            disabled={isSavingDesc}
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => handleSaveDescription()}
                            disabled={isSavingDesc}
                        >
                            {isSavingDesc ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                )}
            </div>

            <Card className="border-none shadow-none bg-muted/20 flex-1 overflow-hidden">
                <CardContent className="p-0 h-full">
                    {isEditing ? (
                        <RichTextEditor
                            content={description}
                            onChange={(html) => {
                                setDescription(html);
                            }}
                            onImageUpload={handleImageUpload}
                            placeholder="Añade una descripción detallada del proyecto..."
                            className="h-full min-h-[300px]"
                        />
                    ) : (
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-y-auto h-full min-h-[200px]"
                            dangerouslySetInnerHTML={{ __html: description || '<p class="text-muted-foreground italic">Sin descripción...</p>' }}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
