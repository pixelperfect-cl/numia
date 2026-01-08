export interface Indicator {
    codigo: string;
    nombre: string;
    unidad_medida: string;
    fecha: string;
    valor: number;
}

export interface ApiResponse {
    version: string;
    autor: string;
    fecha: string;
    uf: Indicator;
    ivp: Indicator;
    dolar: Indicator;
    dolar_intercambio: Indicator;
    euro: Indicator;
    ipc: Indicator;
    utm: Indicator;
    imacec: Indicator;
    tpm: Indicator;
    libra_cobre: Indicator;
    tasa_desempleo: Indicator;
    bitcoin: Indicator;
}

export async function fetchIndicators(): Promise<ApiResponse> {
    try {
        const response = await fetch('https://mindicador.cl/api');
        if (!response.ok) {
            throw new Error(`Error fetching indicators: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch indicators:', error);
        throw error;
    }
}
