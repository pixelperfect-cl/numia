import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getClient, getProject, subscribeToProject } from '@/lib/firebase/database';
import { Project, Client } from '@/types';

import { ProjectGeneralTab } from '@/components/erp/project/tabs/ProjectGeneralTab';

import { ProjectFinanceTab } from '@/components/erp/project/tabs/ProjectFinanceTab';
import { Loader2, LayoutGrid, Server, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function ProjectDetails() {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'general' | 'finance'>('general');

    useEffect(() => {
        if (!projectId) return;

        const unsubscribe = subscribeToProject(projectId, async (p) => {
            if (p) {
                setProject(p);
                const c = await getClient(p.clientId);
                setClient(c);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const handleProjectUpdate = (updatedProject: Project) => {
        setProject(updatedProject);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!project) {
        return <div className="p-8 text-center">Proyecto no encontrado</div>;
    }

    return (
        <div className="h-full flex flex-col min-h-screen bg-background relative">
            {/* Dynamic Header is handled in AppLayout/ContextualHeader */}

            <div className="p-6 max-w-[1600px] w-full mx-auto space-y-6 flex-1 pb-24">
                <AnimatePresence mode="wait">
                    {activeTab === 'general' && (
                        <motion.div
                            key="general"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ProjectGeneralTab project={project} onUpdate={handleProjectUpdate} client={client} />
                        </motion.div>
                    )}

                    {activeTab === 'finance' && (
                        <motion.div
                            key="finance"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ProjectFinanceTab project={project} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Toggle Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center p-1 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                            activeTab === 'general'
                                ? "bg-white text-black shadow-sm"
                                : "text-zinc-400 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        <span>General</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('finance')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                            activeTab === 'finance'
                                ? "bg-white text-black shadow-sm"
                                : "text-zinc-400 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <DollarSign className="h-4 w-4" />
                        <span>Finanzas</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
