export interface ChangeLogEntry {
    version: string;
    date: string;
    changes: {
        type: 'added' | 'changed' | 'fixed' | 'removed';
        description: string;
    }[];
}

export const appStats = {
    loc: 24707, // Líneas de código actualizadas al 16/01/2026
    devHours: 450, // Estimación de horas de desarrollo
    lastUpdated: '2026-01-16'
};

export const changelog: ChangeLogEntry[] = [
    {
        version: '1.0.0-beta',
        date: '2026-01-16',
        changes: [
            // --- NUEVO: Experiencia de Usuario y Navegación ---
            { type: 'added', description: 'Nueva Cabecera Contextual Dinámica: Métricas clave y navegación adaptada a cada sección (Dashboard, ERP, etc.)' },
            { type: 'added', description: 'Modo Privacidad Global: Oculta saldos y montos sensibles con un solo clic (persisente entre sesiones)' },
            { type: 'added', description: 'Gestos táctiles avanzados: Swipe para acciones rápidas y menús móviles' },
            { type: 'added', description: 'Sistema de diseño refinado con Shadcn UI + Tailwind CSS v4, soporte completo modo Oscuro/Claro' },

            // --- Módulo ERP & Gestión de Negocio ---
            { type: 'added', description: 'Dashboard ERP Avanzado: Desglose de MRR, Clientes Activos, y Valor de Proyectos en tiempo real' },
            { type: 'added', description: 'Tablero Kanban de Servicios: Vistas Mensual/Anual, Timeline con drag-to-scroll, y gestión visual de estados' },
            { type: 'added', description: 'Gestión de Proyectos Flexible: Creación de flujos de trabajo personalizados (listas dinámicas) y reordenamiento' },
            { type: 'added', description: 'Gestión de Clientes y Servicios Activos: Historial de pagos, renovaciones y cálculo automático de próximos cobros' },
            { type: 'added', description: 'Soporte para pagos parciales, adelantos y reversión de pagos en servicios' },

            // --- Finanzas y Contabilidad ---
            { type: 'added', description: 'Sistema Multi-Caja y Multi-Moneda: Gestión de cuentas bancarias, efectivo, billeteras (CLP, UF, USD, EUR)' },
            { type: 'added', description: 'Registro de Movimientos Inteligente: Categorización, filtros avanzados, carga masiva (Excel/CSV) y edición en masa' },
            { type: 'added', description: 'Dashboard Financiero: Balance global, tendencias de ingresos/gastos (7 días) e indicadores económicos en tiempo real' },
            { type: 'added', description: 'Proyecciones Financieras: Estimación de flujos futuros a 30 días basado en gastos e ingresos recurrentes' },
            { type: 'added', description: 'Gestión de Deudas y Préstamos: Control de "Me deben" vs "Debo" con amortización y pagos parciales' },

            // --- Inteligencia Artificial & Automatización ---
            { type: 'added', description: 'Asistente IA Contextual: Chat integrado para consultas financieras y navegación asistida' },
            { type: 'added', description: 'Reconocimiento de Voz: Dictado de comandos y notas para el asistente' },
            { type: 'added', description: 'Insights Automáticos: Análisis proactivo de tendencias y anomalías financieras' },

            // --- Plataforma y Seguridad ---
            { type: 'added', description: 'Gestión Multi-Entidad: Soporte para perfiles Personales y Empresariales independientes con aislamiento de datos' },
            { type: 'added', description: 'Seguridad Robusta: Autenticación OAuth (Google), reglas de seguridad en Firestore y protección de rutas' },
            { type: 'added', description: 'Arquitectura Moderna: PWA instalable, funcionamiento Offline (IndexedDB), y sincronización en tiempo real' },
            { type: 'fixed', description: 'Optimizaciones de rendimiento en listas masivas y gráficos complejos' }
        ]
    }
];
