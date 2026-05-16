import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type ConnectionState = 'connected' | 'partial' | 'disconnected';

export interface ConnectionDetails {
    supabase: boolean;
    isOnline: boolean;
}

export function useConnectionStatus() {
    const [status, setStatus] = useState<ConnectionState>('connected');
    const [details, setDetails] = useState<ConnectionDetails>({
        supabase: true,
        isOnline: true,
    });

    useEffect(() => {
        const checkConnection = async () => {
            const isOnline = navigator.onLine;
            let supabaseOk = false;

            if (isOnline) {
                try {
                    const { error } = await supabase.auth.getSession();
                    if (!error) supabaseOk = true;
                } catch (e) {
                    console.warn('Supabase ping failed:', e);
                }
            }

            setDetails({ supabase: supabaseOk, isOnline });

            if (!isOnline) setStatus('disconnected');
            else if (supabaseOk) setStatus('connected');
            else setStatus('partial');
        };

        checkConnection();
        window.addEventListener('online', checkConnection);
        window.addEventListener('offline', checkConnection);
        const interval = setInterval(checkConnection, 30000);

        return () => {
            window.removeEventListener('online', checkConnection);
            window.removeEventListener('offline', checkConnection);
            clearInterval(interval);
        };
    }, []);

    return { status, details };
}
