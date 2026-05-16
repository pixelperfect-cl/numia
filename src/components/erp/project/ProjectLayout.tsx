import { ReactNode } from 'react';
import { ProjectTopBar } from './ProjectTopBar';
import type { Project } from '@/types';

interface ProjectLayoutProps {
    project: Project;
    clientName: string;
    children: ReactNode;
}

export function ProjectLayout({ project, clientName, children }: ProjectLayoutProps) {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-300">
            {/* ProjectTopBar removed, using ContextualHeader */}
            <main className="flex-1 w-full">
                {children}
            </main>
        </div>
    );
}
