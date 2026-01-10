export interface ChangeLogEntry {
    version: string;
    date: string;
    changes: {
        type: 'added' | 'changed' | 'fixed' | 'removed';
        description: string;
    }[];
}

export const appStats = {
    loc: 23444, // Líneas de código actualizadas al 10/01/2026
    devHours: 420, // Estimación de horas de desarrollo
    lastUpdated: '2026-01-10'
};

export const changelog: ChangeLogEntry[] = [
    {
        version: '1.0.0-beta',
        date: '2026-01-10',
        changes: [
            // Autenticación y Seguridad
            { type: 'added', description: 'Autenticación con Google OAuth mediante Firebase Auth' },
            { type: 'added', description: 'Gestión de sesión persistente con protección de rutas' },
            { type: 'added', description: 'Sistema de logout funcional con limpieza de datos locales' },
            { type: 'added', description: 'Aislamiento de datos por usuario (userId) en todas las colecciones' },

            // Dashboard y Visualización
            { type: 'added', description: 'Dashboard principal con resumen global de ingresos, gastos y balance' },
            { type: 'added', description: 'Filtros de fecha: Hoy, Esta Semana, Este Mes, Este Año' },
            { type: 'added', description: 'Gráfico de tendencias de ingresos vs gastos (últimos 7 días)' },
            { type: 'added', description: 'Indicadores económicos en tiempo real (UF, Dólar, Euro, Bitcoin)' },
            { type: 'added', description: 'Marquesina de indicadores económicos con actualización automática' },

            // Gestión de Entidades
            { type: 'added', description: 'Creación y gestión de múltiples entidades (personal/empresarial)' },
            { type: 'added', description: 'Selector de entidad con persistencia en localStorage' },
            { type: 'added', description: 'Configuración individual por entidad (nombre, tipo, moneda)' },
            { type: 'added', description: 'Soporte para múltiples monedas (CLP, USD, EUR)' },

            // Sistema de Cajas
            { type: 'added', description: 'Gestión de múltiples cajas por entidad (bancarias, efectivo, billeteras digitales)' },
            { type: 'added', description: 'Balance individual y consolidado de cajas' },
            { type: 'added', description: 'Tipos de caja: Cuenta Corriente, Cuenta Vista, Cuenta de Ahorro, Efectivo, Billetera Digital' },
            { type: 'added', description: 'Visualización de saldo actual por caja en el dashboard' },

            // Movimientos (Ingresos y Gastos)
            { type: 'added', description: 'Registro de movimientos con categorización automática' },
            { type: 'added', description: 'Soporte para ingresos y gastos con múltiples categorías' },
            { type: 'added', description: 'Filtrado avanzado por fecha, tipo, categoría y caja' },
            { type: 'added', description: 'Edición y eliminación de movimientos con actualización en tiempo real' },
            { type: 'added', description: 'Carga masiva de movimientos desde archivo CSV/Excel' },
            { type: 'added', description: 'Búsqueda de movimientos por descripción' },
            { type: 'added', description: 'Selección múltiple de movimientos con Shift' },
            { type: 'added', description: 'Vista responsiva: tabla en desktop, tarjetas en móvil' },

            // Préstamos
            { type: 'added', description: 'Gestión de préstamos: "Me deben" y "Debo"' },
            { type: 'added', description: 'Registro de pagos parciales con historial completo' },
            { type: 'added', description: 'Cálculo automático de saldo pendiente' },
            { type: 'added', description: 'Integración con sistema de movimientos al registrar préstamos' },
            { type: 'added', description: 'Visualización de estado: Pendiente, Pagado Parcialmente, Completado' },

            // Proyecciones Financieras
            { type: 'added', description: 'Sistema de proyecciones para gastos e ingresos fijos' },
            { type: 'added', description: 'Configuración de frecuencia: Diaria, Semanal, Quincenal, Mensual, Anual' },
            { type: 'added', description: 'Cálculo de proyección a 30 días vista' },
            { type: 'added', description: 'Conversión automática de monedas (UF a CLP)' },
            { type: 'added', description: 'Activación/desactivación de proyecciones sin eliminarlas' },

            // Suscripciones y Gastos Recurrentes
            { type: 'added', description: 'Gestión de suscripciones mensuales y anuales' },
            { type: 'added', description: 'Cálculo de próximo pago automático' },
            { type: 'added', description: 'Categorización de suscripciones (Streaming, Software, Servicios, etc.)' },
            { type: 'added', description: 'Visualización de costo mensual y anual total' },

            // Módulo ERP Completo
            { type: 'added', description: 'ERP Dashboard con métricas de negocio: ingresos, clientes activos, proyectos' },
            { type: 'added', description: 'Gestión completa de Clientes con información de contacto' },
            { type: 'added', description: 'Catálogo de Servicios con precios y descripciones' },
            { type: 'added', description: 'Sistema de Servicios Activos (suscripciones a clientes)' },
            { type: 'added', description: 'Cálculo de ARR (Annual Recurring Revenue) y MRR (Monthly Recurring Revenue)' },
            { type: 'added', description: 'Gestión de pagos de servicios con historial' },
            { type: 'added', description: 'Archivado de servicios con razones y comentarios' },
            { type: 'added', description: 'Gestión de Proyectos con estados: Planificación, En Progreso, Completado, Cancelado' },
            { type: 'added', description: 'Asignación de proyectos a clientes' },
            { type: 'added', description: 'Seguimiento de fechas de inicio y fin de proyectos' },

            // UI/UX y Diseño
            { type: 'added', description: 'Sistema de diseño completo con Shadcn UI + Tailwind CSS v4' },
            { type: 'added', description: 'Modo oscuro y claro con persistencia de preferencia' },
            { type: 'added', description: 'Diseño responsive optimizado para móvil, tablet y desktop' },
            { type: 'added', description: 'Navegación móvil con menú hamburguesa' },
            { type: 'added', description: 'Sidebar colapsable en desktop' },
            { type: 'added', description: 'Animaciones y transiciones suaves' },
            { type: 'added', description: 'Toasts y notificaciones para feedback de usuario' },
            { type: 'added', description: 'Dialogs modales para acciones críticas' },
            { type: 'added', description: 'Indicador de estado de conexión a base de datos' },

            // Configuración y Personalización
            { type: 'added', description: 'Panel de configuración unificado con pestañas' },
            { type: 'added', description: 'Configuración de cuenta con foto de perfil' },
            { type: 'added', description: 'Gestión de preferencias de notificaciones' },
            { type: 'added', description: 'Configuración de zona horaria' },
            { type: 'added', description: 'Configuración avanzada de entidad (ERP, SMTP)' },
            { type: 'added', description: 'Sistema de versionado y changelog integrado' },

            // Arquitectura y Rendimiento
            { type: 'added', description: 'Code splitting con React Router y lazy loading' },
            { type: 'added', description: 'Optimización de bundle con Vite' },
            { type: 'added', description: 'Context API para gestión de estado global' },
            { type: 'added', description: 'Sincronización en tiempo real con Firestore' },
            { type: 'added', description: 'Persistencia offline con IndexedDB' },
            { type: 'added', description: 'Caché de datos para mejor rendimiento' },

            // Integraciones
            { type: 'added', description: 'Integración con API de indicadores económicos chilenos' },
            { type: 'added', description: 'Firebase Firestore como base de datos principal' },
            { type: 'added', description: 'Firebase Auth para autenticación' },
            { type: 'added', description: 'Firebase Storage para archivos (preparado)' },

            // Acciones Rápidas
            { type: 'added', description: 'Botón de acciones rápidas para crear movimientos, préstamos, clientes, servicios y proyectos' },
            { type: 'added', description: 'Acceso rápido desde cualquier página de la aplicación' },

            // Mejoras Técnicas
            { type: 'fixed', description: 'Corrección de errores en cálculo de balances y sincronización' },
            { type: 'fixed', description: 'Resolución de conflictos de tipos en build de producción' },
            { type: 'fixed', description: 'Optimización de consultas a Firestore para mejor rendimiento' },
            { type: 'changed', description: 'Refactorización completa de UI/UX con componentes reutilizables' },
            { type: 'changed', description: 'Migración a Tailwind CSS v4 para mejor rendimiento' },
            { type: 'changed', description: 'Optimización de navegación móvil y responsive design' }
        ]
    }
];
