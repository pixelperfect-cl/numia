
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects } from '@/lib/supabase/database';

export function useProjectMetrics(selectedEntityId: string) {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        active: 0,
        archived: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            if (!user || !selectedEntityId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Determine entity filter logic. 
                // Currently projects are stored with entityId, but some legacy might not have it clearly linked if not migrated.
                // Assuming getProjects returns all user projects, we filter by entityId.
                const projects = await getProjects(user.uid);
                const entityProjects = projects.filter(p => p.entityId === selectedEntityId);

                const active = entityProjects.filter(p => !p.archived).length;
                const archived = entityProjects.filter(p => p.archived).length;

                setStats({
                    active,
                    archived
                });

            } catch (error) {
                console.error("Error loading project metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadMetrics();
    }, [user, selectedEntityId]);

    return { ...stats, loading };
}
