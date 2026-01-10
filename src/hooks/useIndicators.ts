import { useState, useEffect } from 'react';
import { fetchIndicators, ApiResponse, Indicator } from '@/lib/indicators';
import { ApiPreference } from '@/types';

export function useIndicators(preferences?: ApiPreference[]) {
    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const data: ApiResponse = await fetchIndicators();

            const availableIndicators: Indicator[] = [];

            // If preferences are provided, use them to filter and sort
            if (preferences && preferences.length > 0) {
                preferences.forEach(pref => {
                    const key = pref.id as keyof ApiResponse;
                    const ind = data[key];
                    if (pref.enabled && ind && typeof ind === 'object' && 'codigo' in ind) {
                        availableIndicators.push(ind as Indicator);
                    }
                });
            } else {
                // Default behavior if no preferences provided (fallback for backward compatibility or initial state)
                const defaultKeys: (keyof ApiResponse)[] = ['uf', 'dolar', 'euro', 'utm'];

                defaultKeys.forEach(key => {
                    const ind = data[key];
                    if (ind && typeof ind === 'object' && 'codigo' in ind) {
                        availableIndicators.push(ind as Indicator);
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
    }, [JSON.stringify(preferences)]); // Reload when preferences change

    return { indicators, loading, error };
}
