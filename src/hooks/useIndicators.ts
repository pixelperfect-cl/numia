import { useState, useEffect } from 'react';
import { fetchIndicators, ApiResponse, Indicator } from '@/lib/indicators';
import { ApiPreference } from '@/components/configuration/AdvancedSettings';

export function useIndicators() {
    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const data: ApiResponse = await fetchIndicators();

            const savedPrefs = localStorage.getItem('api_preferences');
            let preferences: ApiPreference[] = [];

            if (savedPrefs) {
                try {
                    preferences = JSON.parse(savedPrefs);
                } catch (e) {
                    console.error('Error parsing prefs', e);
                }
            }

            // Helper to check if an ID should be shown
            // If we have saved prefs, check if enabled. 
            // If specific ID not in prefs (newly added), fallback to default behavior?
            // Actually, ApiSettings logic merges defaults, so if the user visited settings it would be fine.
            // But if they haven't, we might miss new ones.
            // Let's rely on checking if `preferences` has it enabled, or if `preferences` is empty check default list.

            const isEnabled = (id: string) => {
                if (!savedPrefs) {
                    // Defaults if never saved
                    return ['uf', 'dolar', 'euro', 'utm'].includes(id);
                }
                const pref = preferences.find(p => p.id === id);
                return pref ? pref.enabled : false;
            };

            const availableIndicators: Indicator[] = [];

            // List of all keys to check in response that match our known IDs
            // Note: API keys might differ slightly from our IDs if we mapped them, but here they match indicators.ts interface
            const keys: (keyof ApiResponse)[] = [
                'uf', 'dolar', 'euro', 'utm', 'bitcoin',
                'ipc', 'ivp', 'imacec', 'tpm', 'libra_cobre', 'tasa_desempleo'
            ];

            // Sort available indicators based on the order in saved preferences
            if (savedPrefs) {
                preferences.forEach(pref => {
                    const key = pref.id as keyof ApiResponse;
                    const ind = data[key];
                    if (pref.enabled && ind && typeof ind === 'object' && 'codigo' in ind) {
                        availableIndicators.push(ind as Indicator);
                    }
                });
                // Also check for any new keys that might not be in prefs yet if we want them to show up (or not). 
                // Current logic implies strict adherence to preferences for order. 
                // If a key is missing from prefs, it won't show, which is correct for a configured list.
            } else {
                // Default order if no prefs
                keys.forEach(key => {
                    const ind = data[key as keyof ApiResponse];
                    if (ind && typeof ind === 'object' && 'codigo' in ind) {
                        if (isEnabled(key)) {
                            availableIndicators.push(ind as Indicator);
                        }
                    }
                });
            }

            setIndicators(availableIndicators);
            setError(null);
        } catch (err) {
            setError('No se pudieron cargar los indicadores');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const handlePreferencesChanged = () => {
            loadData();
        };
        window.addEventListener('api-preferences-changed', handlePreferencesChanged);
        return () => {
            window.removeEventListener('api-preferences-changed', handlePreferencesChanged);
        };
    }, []);

    return { indicators, loading, error };
}
