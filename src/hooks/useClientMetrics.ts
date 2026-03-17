
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClients } from '@/lib/supabase/database';

export function useClientMetrics(selectedEntityId: string) {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0
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
                const clients = await getClients(user.uid);
                const entityClients = clients.filter(c => c.entityId === selectedEntityId);

                const active = entityClients.filter(c => c.status === 'active').length;
                const inactive = entityClients.length - active;

                setStats({
                    total: entityClients.length,
                    active,
                    inactive
                });

            } catch (error) {
                console.error("Error loading client metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadMetrics();
    }, [user, selectedEntityId]);

    return { ...stats, loading };
}
