import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type ConnectionState = 'connected' | 'partial' | 'disconnected';

export interface ConnectionDetails {
    firebase: boolean;
    supabase: boolean;
    isOnline: boolean;
}

export function useConnectionStatus() {
    const [status, setStatus] = useState<ConnectionState>('connected');
    const [details, setDetails] = useState<ConnectionDetails>({
        firebase: true,
        supabase: true,
        isOnline: true,
    });

    useEffect(() => {
        const checkConnection = async () => {
            const isOnline = navigator.onLine;
            let supabaseOk = false;

            if (isOnline) {
                try {
                    // Lightweight ping to Supabase
                    const { error } = await supabase.from('entities').select('count', { count: 'exact', head: true });
                    if (!error) {
                        supabaseOk = true;
                    }
                } catch (e) {
                    console.warn('Supabase ping failed:', e);
                }
            }

            // We assume Firebase is OK if browser is online, as it manages its own connection robustly.
            // If we are offline, both are considered down for "Remote" status purposes.
            // const firebaseOk = isOnline;

            setDetails({
                firebase: false, // Legacy disabled
                supabase: supabaseOk,
                isOnline: isOnline,
            });

            if (!isOnline) {
                setStatus('disconnected');
            } else if (supabaseOk) {
                setStatus('connected');
            } else {
                setStatus('partial');
            }
        };

        // Initial check
        checkConnection();

        // Listen for online/offline events
        window.addEventListener('online', checkConnection);
        window.addEventListener('offline', checkConnection);

        // Periodic check every 30 seconds
        const interval = setInterval(checkConnection, 30000);

        return () => {
            window.removeEventListener('online', checkConnection);
            window.removeEventListener('offline', checkConnection);
            clearInterval(interval);
        };
    }, []);

    return { status, details };
}
