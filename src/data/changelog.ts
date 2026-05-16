export interface ChangeLogEntry {
    version: string;
    date: string;
    changes: {
        type: 'added' | 'changed' | 'fixed' | 'removed';
        description: string;
    }[];
}

export const appStats = {
    loc: 42932, // Líneas de código al 16/05/2026
    devHours: 752, // Estimación de horas de desarrollo
    lastUpdated: '2026-05-16'
};

export const changelog: ChangeLogEntry[] = [
    {
        version: '1.1.0',
        date: '2026-05-16',
        changes: [
            // ─── Infraestructura: Migración Firebase → Supabase ───
            { type: 'changed', description: 'Migración completa de Firebase/Firestore a Supabase: removidas dependencias firebase y firebase-tools' },
            { type: 'removed', description: 'Eliminados artefactos legacy: firebase.json, firestore.rules, firestore.indexes.json, storage.rules, FIREBASE_STORAGE_SETUP.md, carpeta .firebase' },
            { type: 'added', description: 'Migraciones SQL versionadas en supabase/migrations: RLS por user_id en 12 tablas, email_log, cron_billing, remove_legacy_smtp_apikey' },
            { type: 'added', description: 'Edge functions Deno en supabase/functions: ai-chat, send-billing-email, run-billing-for-user, test-elasticemail, módulo _shared con cors y auth' },
            { type: 'added', description: 'Cron diario (pg_cron + pg_net) que dispara run-billing-for-user a las 12:00 UTC para fan-out de cobros por usuario' },

            // ─── AI: Migración OpenAI → Claude (Sonnet 4.6) ───
            { type: 'changed', description: 'AI Assistant migrado de OpenAI a Anthropic Claude (claude-sonnet-4-6) vía edge function ai-chat — la API key ya no se expone al navegador' },
            { type: 'changed', description: 'AIContext.sendMessage refactorizado con messagesRef para evitar recreaciones por mensaje; value del Provider memoizado' },
            { type: 'removed', description: 'Eliminado dangerouslyAllowBrowser: AI ya no se ejecuta client-side con credenciales expuestas' },

            // ─── SMTP: ElasticEmail seguro ───
            { type: 'added', description: 'Edge function test-elasticemail valida la API key sin exponerla en el cliente; SMTPPanel ya no acepta apiKey en su formulario' },
            { type: 'removed', description: 'Campo apiKey legacy borrado del JSON entities.settings.smtpConfig (migración remove_legacy_smtp_apikey)' },
            { type: 'added', description: 'Warning en SMTPPanel si detecta apiKey legacy en config existente' },

            // ─── Sistema de Notificaciones: triggers cableados end-to-end ───
            { type: 'added', description: 'Trigger service_due ahora dispara desde el cron diario: X días antes del próximo cobro envía email recordatorio al cliente (configurable por reminder)' },
            { type: 'added', description: 'Trigger project_status ahora dispara desde el frontend: al cambiar el estado de un proyecto (drag-end en Kanban o dropdown del header) se envía email automático según la plantilla configurada para esa columna' },
            { type: 'added', description: 'Trigger billing_generated dispara desde el cron al generar movimientos de suscripción Y de proyecto, iterando todas las plantillas habilitadas que aplican al cliente' },
            { type: 'added', description: 'Selección granular de destinatarios por trigger: recipientMode "all" o "specific" con lista de clientIds; persistida y respetada al enviar' },
            { type: 'added', description: 'Edición in-place de destinatarios desde la tarjeta del trigger (sin volver al wizard); badge rojo "⚠ Sin destinatarios" cuando un trigger activo no envía a nadie' },
            { type: 'added', description: 'Iteración de TODAS las plantillas habilitadas: si configuras 2 plantillas billing_generated, el cron envía ambas (con dedup por template_id)' },
            { type: 'added', description: 'Plantillas por defecto cargables con 1 click ("Cargar plantillas de ejemplo"), distintas según scope (services usa {{service_name}}, projects usa {{project_name}} + {{installment_label}})' },
            { type: 'added', description: 'email_log con índices únicos parciales: dedup por (subscription_id, billing_period, template_id, trigger_type) ó (project_id, installment_id, template_id, trigger_type) — incluir trigger_type evita que service_due bloquee al billing_generated posterior' },
            { type: 'added', description: 'Variables UI de la tarjeta de trigger ahora son scope-aware: en Proyectos billing_generated muestra {{project_name}} y {{installment_label}}' },

            // ─── ERP: Proyectos — Cobros Programados ───
            { type: 'added', description: 'Cobros programados por proyecto (Project.billingInstallments): cada installment tiene fecha, monto y etiqueta opcional; el cron genera el movement automáticamente cuando la fecha llega' },
            { type: 'added', description: 'BillingScheduleCard en pestaña Finanzas del proyecto: CRUD de cobros programados con estado generado/pendiente; los generados son inmutables' },
            { type: 'added', description: 'Cron Phase 3 procesa installments: insert idempotente del movement con project_id + billing_period, marca generated=true con movementId, envía billing_generated emails' },
            { type: 'added', description: 'send-billing-email acepta projectId/installmentId además de subscriptionId; renderiza {{project_name}}, {{installment_label}} y {{item_name}}' },
            { type: 'added', description: 'Tab "Plantillas de Email" dentro del panel de Proyectos (scope="projects") muestra project_status + billing_generated' },
            { type: 'added', description: 'Migración 20260517_project_billing_and_email_log.sql: columnas amount/currency/start_date/billing_installments en projects, project_id/installment_id en email_log' },
            { type: 'fixed', description: 'mapper.mapProject ya no descarta el campo amount al persistir; ahora también mapea billingInstallments, techDetails y startDate' },

            // ─── ERP: Servicios — Pagos y UF ───
            { type: 'added', description: 'PaymentRecord ampliado con billingPeriod, isPartial, amountUF y ufRateAtPayment para snapshot del tipo de cambio al momento del pago' },
            { type: 'fixed', description: 'Bloqueo de pago "completo" duplicado para mismo billingPeriod en suscripciones (alerta el conflicto y sugiere usar pago parcial o revertir)' },
            { type: 'added', description: 'Generación automática de cobros (run-billing-for-user) ahora resuelve la entidad por cliente (no asigna todo a entities[0]) y la box default correcta de cada entidad' },
            { type: 'changed', description: 'billing.ts local refactorizado: dedup vía findMovementBySubscriptionPeriod, orden update→insert con rollback, snapshot UF, stats detalladas (created, skippedDuplicate, skippedZombie, failed, failures)' },
            { type: 'removed', description: 'handleGenerateBilling de Services.tsx eliminado: era código muerto que además no disparaba emails (solo el cron lo hace)' },

            // ─── Performance / Estabilidad de React ───
            { type: 'fixed', description: 'DataContext: value del Provider memoizado para evitar re-renders en cascada' },
            { type: 'fixed', description: 'PrivacyContext: try/catch en localStorage + value memoizado (evita crashes en navegación privada)' },
            { type: 'fixed', description: 'NotificationContext: fetch duplicado eliminado y channel de Realtime scope-eado por usuario (notifications:${user.uid})' },
            { type: 'fixed', description: 'App.tsx localStorage envuelto en try/catch (mismo motivo de PrivacyContext)' },

            // ─── Limpieza / Refactor ───
            { type: 'removed', description: 'EmailTemplatesPanel.tsx eliminado: componente legacy duplicado de NotificationSettings con un tipo "scheduled" no expuesto' },
            { type: 'fixed', description: 'NotificationSettings.handleLoadDefaults ya no duplica plantillas service_due al click repetido (chequea hasService antes de inyectar)' },
            { type: 'fixed', description: 'send-billing-email retorna respuestas con array de resultados por plantilla (sent/failed/alreadySent), no solo la primera' },
            { type: 'fixed', description: 'email_log insert en el cron ahora se awaitea y loggea errores en stats (antes podía duplicar emails si el log fallaba silenciosamente)' },
            { type: 'changed', description: 'README, DATABASE_GUIDELINES y .env.example actualizados al stack actual (Supabase + Anthropic + ElasticEmail)' },
            { type: 'added', description: 'useConnectionStatus reescrito con health-check directo a Supabase (sin firebase imports)' },
        ]
    },
    {
        version: '1.0.5',
        date: '2026-04-02',
        changes: [
            // ─── Módulo ERP: Servicios ───
            { type: 'fixed', description: 'Corrección de montos pendientes fantasma en tarjetas de servicio: servicios marcados como "Pagado" ya no muestran pequeñas deudas residuales causadas por la fluctuación del valor de la UF' },
            { type: 'changed', description: 'Tolerancia de pago dinámica: margen del 1% del monto total para servicios en UF (reemplaza umbral fijo de $10 CLP) para absorber variaciones de tipo de cambio' },
            { type: 'fixed', description: 'Barra de progreso de pagos parciales ahora se oculta correctamente cuando el servicio está completamente pagado (clamping a 100%)' },
            { type: 'fixed', description: 'Status "Pagado" en vista Kanban ahora considera correctamente el margen de tolerancia además del período de facturación' },
            { type: 'fixed', description: 'Montos pendientes negativos prevenidos con Math.max(0, ...) en cálculos de deuda residual' },

            // ─── Módulo de Movimientos ───
            { type: 'fixed', description: 'Navegador de meses (← →) ahora siempre visible en la página de Movimientos, incluso cuando no hay registros en el período seleccionado' },
            { type: 'changed', description: 'Estado vacío de movimientos mejorado: muestra controles de navegación temporal y botón "Ir al mes anterior" para facilitar la exploración' },
        ]
    },
    {
        version: '1.0.4',
        date: '2026-03-21',
        changes: [
            // ─── UI/UX y Dashboard ───
            { type: 'changed', description: 'Aplicación de estilos y animaciones del dashboard a las tarjetas de la vista de Movimientos' },
            { type: 'added', description: 'Gráficos tipo Sparkline añadidos a la tarjeta de "Servicios Activos"' },
            
            // ─── Módulo de Movimientos ───
            { type: 'fixed', description: 'Sincronización de todos los gráficos ("Ingresos vs Gastos", "Actividad de Movimientos", etc.) con el selector de rango de fechas global' }
        ]
    },
    {
        version: '1.0.3',
        date: '2026-03-21',
        changes: [
            // ─── Rendimiento ───
            { type: 'changed', description: 'Optimización de carga de servicios: consulta única (getAllSubscriptions) reemplaza patrón N+1 por cliente' },
            { type: 'added', description: 'Cache en memoria (5 min TTL) para servicios: navegación instantánea sin spinner al volver a la sección' },
            { type: 'changed', description: 'Eliminación de fetch innecesario de movimientos (getMovements) en la carga inicial de servicios' },

            // ─── Fixes ───
            { type: 'fixed', description: 'ServiceDetailPanel: unificación de dos componentes Tabs de Radix separados en un único root para correcto renderizado de contenido' },
            { type: 'fixed', description: 'ServiceKanbanBoard: drag-to-scroll en vista anual ya no consume eventos click en tarjetas de servicio (umbral de 5px)' },
            { type: 'fixed', description: 'useConnectionStatus: reemplazo de health-check con HEAD a entities (que fallaba) por supabase.auth.getSession()' },
        ]
    },
    {
        version: '1.0.2',
        date: '2026-03-21',
        changes: [
            // ─── Sistema de Notificaciones ───
            { type: 'added', description: 'Sistema de triggers de notificación: service_due, project_status, billing_generated con configuración por tipo' },
            { type: 'added', description: 'Wizard de creación de notificaciones paso a paso (NotificationCreationWizard)' },
            { type: 'added', description: 'Panel de templates de email personalizables (EmailTemplatesPanel)' },
            { type: 'added', description: 'Categorías de notificación: service, project, billing, scheduled, general' },
            { type: 'added', description: 'Audiencia objetivo de notificaciones: client, admin, all' },
            { type: 'changed', description: 'Refactorización completa de NotificationSettings con 2 pestañas: triggers activos y gestión' },

            // ─── SMTP ───
            { type: 'added', description: 'Botón "Test Connection" en panel SMTP para verificar conectividad antes de guardar' },
            { type: 'changed', description: 'Panel SMTP mejorado con iconos de estado (éxito/error) y feedback visual del test' },

            // ─── Panel de Detalle de Servicios ───
            { type: 'added', description: 'Panel lateral de detalle de servicio (ServiceDetailPanel) con pestañas: General, Finanzas, Checklists, Documentos, Notas' },
            { type: 'added', description: 'Checklists de tareas por servicio con ítems completables (ServiceChecklistTab)' },
            { type: 'added', description: 'Pestaña de finanzas por servicio con historial de pagos (ServiceFinanceTab)' },
            { type: 'added', description: 'Pestaña de documentos adjuntos por servicio (ServiceDocumentsTab)' },
            { type: 'added', description: 'Pestaña de notas y actividad por servicio (ServiceNotesTab)' },
            { type: 'added', description: 'Tipos ServiceChecklist, ServiceChecklistItem y ServiceActivityEntry en el modelo de datos' },

            // ─── ERP: Servicios ───
            { type: 'changed', description: 'Rediseño del resumen de servicios: gráfico Donut de distribución reemplaza vistas anteriores' },
            { type: 'changed', description: 'Gráfico de barras de servicios con colores por celda (Cell component de Recharts)' },
            { type: 'removed', description: 'Pestaña "Configuración" eliminada de Servicios (ahora centralizada en Configuración global)' },
            { type: 'removed', description: 'ServiceSettingsPanel eliminado de la vista de servicios' },

            // ─── Navegación y Configuración ───
            { type: 'added', description: 'Sidebar de configuración interna (ConfigSidebar) para navegación entre secciones' },
            { type: 'added', description: 'Pestaña "Notificaciones" añadida al menú de Configuración en sidebar principal' },
            { type: 'changed', description: 'Configuración de entidad refactorizada: navegación por sidebar lateral en vez de tabs' },
            { type: 'changed', description: 'Título de página de configuración muestra la sección activa (ej: "Entidad — Notificaciones")' },
            { type: 'removed', description: 'Sub-ítems "Configuración" eliminados de menús de Servicios y Proyectos en sidebar' },

            // ─── ERP: Proyectos ───
            { type: 'removed', description: 'Pestaña "Configuración" eliminada de Proyectos (centralizada en Configuración global)' },

            // ─── Fixes ───
            { type: 'fixed', description: 'Diálogo de eliminación de subcategorías mejorado con mejor manejo de estado' },
            { type: 'fixed', description: 'Módulos panel: toggle refactorizado para mejor UX' },
            { type: 'fixed', description: 'Corrección en selección de cliente: ClientSelectionDialog y ClientSelectionStep actualizados' },
            { type: 'fixed', description: 'ProjectFinanceCard: corrección de cálculos financieros' },
            { type: 'fixed', description: 'BoxDialog y EntityForm: ajustes menores de comportamiento' },
        ]
    },
    {
        version: '1.0.1',
        date: '2026-03-17',
        changes: [
            // ─── Proyectos: Logo ───
            { type: 'added', description: 'Logo de proyecto: subida, edición y eliminación desde el detalle del proyecto (pestaña General)' },
            { type: 'added', description: 'Logo visible como banner en las tarjetas del tablero Kanban de proyectos' },
            { type: 'added', description: 'Logo con aspecto flexible (object-contain) para soportar logos horizontales y verticales' },
            { type: 'added', description: 'Logo editable desde el wizard de creación y diálogo de edición de proyectos' },
            { type: 'added', description: 'Cache-busting automático al reemplazar logo para evitar caché del navegador' },

            // ─── Proyectos: Archivado y Eliminación ───
            { type: 'fixed', description: 'Corrección de error 400 al archivar proyectos: eliminado campo "archived" inexistente en la base de datos' },
            { type: 'fixed', description: 'Botones "Archivar Proyecto" y "Eliminar Proyecto" en la pestaña Configuración ahora funcionan correctamente' },
            { type: 'fixed', description: 'Restaurar proyecto ahora limpia correctamente archive_date en la base de datos (null en vez de undefined)' },

            // ─── UI/UX ───
            { type: 'changed', description: 'Scrollbar horizontal personalizada en el tablero Kanban de proyectos con diseño acorde a la app' },
            { type: 'changed', description: 'Logo en tarjetas de proyecto y header contextual con dimensiones flexibles para logos no cuadrados' },
        ]
    },
    {
        version: '1.0.0-beta',
        date: '2026-03-16',
        changes: [
            // ─── Arquitectura y Plataforma ───
            { type: 'added', description: 'Stack tecnológico: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS v4 + Shadcn/Radix UI' },
            { type: 'added', description: 'Backend Supabase: Autenticación, Base de Datos Postgres, Storage, y Realtime integrados' },
            { type: 'added', description: 'Integración IA: Asistente con OpenAI GPT para consultas financieras y navegación contextual' },
            { type: 'added', description: 'PWA instalable con soporte offline y sincronización en tiempo real' },
            { type: 'added', description: 'Lazy loading de todas las páginas para optimización de carga' },
            { type: 'added', description: 'Sistema de diseño completo con soporte Modo Oscuro / Claro' },

            // ─── Autenticación y Multi-Entidad ───
            { type: 'added', description: 'Login con Google OAuth vía Supabase Auth' },
            { type: 'added', description: 'Sistema Multi-Entidad: perfiles Personales y Empresariales con aislamiento completo de datos' },
            { type: 'added', description: 'Selector de entidad con persistencia en LocalStorage' },
            { type: 'added', description: 'Perfil de entidad configurable: logo, RUT, email, teléfono, website, dirección' },

            // ─── Dashboard Principal ───
            { type: 'added', description: 'Dashboard con 28+ widgets de métricas financieras y operacionales' },
            { type: 'added', description: 'Widgets de balance global, ingresos/gastos, donut de gastos mensuales, y velocidad financiera' },
            { type: 'added', description: 'Gráficos avanzados: Revenue Wave anual, Heatmaps de actividad mensual y de servicios, SparkAreas' },
            { type: 'added', description: 'Panel de semáforo (TrafficLight) para estado rápido del negocio' },
            { type: 'added', description: 'Widget de crecimiento (GrowthWidget) y anillos de métricas (MetricRing)' },
            { type: 'added', description: 'Feed de operaciones recientes y lista de próximas renovaciones' },
            { type: 'added', description: 'Sidebar de dashboard con métricas consolidadas' },
            { type: 'added', description: 'Indicadores económicos en tiempo real: UF, USD, EUR en marquee horizontal' },

            // ─── Módulo de Movimientos ───
            { type: 'added', description: 'CRUD completo de ingresos y gastos con categorización y subcategorías' },
            { type: 'added', description: 'Sistema Multi-Caja y Multi-Moneda: gestión de cuentas bancarias, efectivo, billeteras (CLP, UF, USD, EUR)' },
            { type: 'added', description: 'Filtros avanzados por período, categoría, caja, tipo de movimiento y búsqueda de texto' },
            { type: 'added', description: 'Historial de cambios por movimiento (auditoría de ediciones)' },
            { type: 'added', description: 'Vinculación de movimientos con clientes ERP, suscripciones y proyectos' },
            { type: 'added', description: 'Carga masiva desde archivos Excel/CSV con wizard de validación paso a paso' },
            { type: 'added', description: 'Parser inteligente de cartolas bancarias (BCI activo, extensible a otros bancos)' },
            { type: 'added', description: 'Detección automática de duplicados por código de transacción bancaria' },
            { type: 'added', description: 'Resumen post-importación: conteo de movimientos importados vs omitidos' },
            { type: 'added', description: 'Gráficos de área de movimientos y flujo de caja interactivo' },
            { type: 'added', description: 'Transferencias entre cajas con registro de movimiento dual' },

            // ─── Gestión de Categorías ───
            { type: 'added', description: 'Categorías de ingreso/gasto personalizables con iconos FontAwesome y colores' },
            { type: 'added', description: 'Subcategorías anidadas con CRUD completo' },
            { type: 'added', description: 'Set de categorías por defecto predefinidas al crear entidad' },
            { type: 'added', description: 'Pie chart de distribución de gastos/ingresos por categoría' },
            { type: 'added', description: 'Diálogos de confirmación para eliminación de categorías y subcategorías' },

            // ─── Módulo de Préstamos/Deudas ───
            { type: 'added', description: 'Control de deudas bidireccional: "Me deben" vs "Debo" con estados diferenciados' },
            { type: 'added', description: 'Sistema de pagos parciales con historial completo de amortización' },
            { type: 'added', description: 'Cálculo automático de estado (pendiente/pagado) según monto abonado' },
            { type: 'added', description: 'Métricas de préstamos: total prestado, total adeudado, balance neto' },

            // ─── Proyecciones Financieras ───
            { type: 'added', description: 'Proyecciones con períodos semanales, mensuales y anuales' },
            { type: 'added', description: 'Ingresos y gastos fijos proyectados con categorización' },
            { type: 'added', description: 'Cálculo de balance disponible estimado a futuro' },
            { type: 'added', description: 'Métricas de proyección integradas en el header contextual' },

            // ─── Suscripciones Personales ───
            { type: 'added', description: 'Gestión de suscripciones recurrentes propias (mensuales/anuales)' },
            { type: 'added', description: 'Gráficos de distribución de suscripciones' },
            { type: 'added', description: 'Formulario detallado con vinculación a categoría y caja' },

            // ─── Módulo ERP: Dashboard ───
            { type: 'added', description: 'Dashboard ERP con MRR, clientes activos, valor total de proyectos y tendencias en tiempo real' },
            { type: 'added', description: 'Grilla anual de servicios (AnnualServiceGrid) para vista panorámica' },
            { type: 'added', description: 'Radial chart de ingresos por servicio y heatmap de servicios' },
            { type: 'added', description: 'Widget de proyectos activos y próximas renovaciones' },

            // ─── Módulo ERP: Clientes ───
            { type: 'added', description: 'CRUD completo de clientes con RUT, representante, emails y teléfonos múltiples' },
            { type: 'added', description: 'Vista detallada de cliente con historial de servicios y pagos' },
            { type: 'added', description: 'Selección de cliente con búsqueda y creación rápida desde cualquier contexto' },
            { type: 'added', description: 'Validación de formatos para números telefónicos chilenos' },

            // ─── Módulo ERP: Servicios ───
            { type: 'added', description: 'Tablero Kanban de servicios con vistas mensual y anual' },
            { type: 'added', description: 'Timeline con drag-to-scroll y gestión visual de estados' },
            { type: 'added', description: 'Soporte para servicios en CLP y UF con frecuencia mensual o anual' },
            { type: 'added', description: 'Pagos parciales, adelantos y reversión de pagos en servicios' },
            { type: 'added', description: 'Archivado de servicios con razón, notas y fecha de archivo' },
            { type: 'added', description: 'Catálogo de servicios predefinidos (ServiceDefinition) reutilizables' },
            { type: 'added', description: 'Historial de pagos detallado con indicador de respaldo financiero' },
            { type: 'added', description: 'Lógica de cobro: servicios anuales pagables con 60 días de anticipación, mensuales con 7 días' },
            { type: 'added', description: 'Configuración de recordatorios de cobro por email con templates personalizables' },

            // ─── Módulo ERP: Proyectos ───
            { type: 'added', description: 'Gestión de proyectos con listas dinámicas personalizables (Kanban con drag & drop)' },
            { type: 'added', description: 'Vista detallada con pestañas: Overview, General, Finanzas, Tareas, Equipo, Credenciales, Técnico, Actividad, Configuración' },
            { type: 'added', description: 'Checklists múltiples dentro de cada proyecto con ítems arrastrables' },
            { type: 'added', description: 'Milestones/Roadmap con estados (pending, active, completed)' },
            { type: 'added', description: 'Gestión de equipo: miembros con nombre, rol y email' },
            { type: 'added', description: 'Bóveda de credenciales: almacenamiento de accesos (título, usuario, contraseña, URL)' },
            { type: 'added', description: 'Detalles técnicos: stack tecnológico, repositorio, hosting' },
            { type: 'added', description: 'Entornos de despliegue (producción/staging/dev) con estado de salud, URL, uptime y versión' },
            { type: 'added', description: 'Links rápidos del proyecto: GitHub, Figma, URL personalizada' },
            { type: 'added', description: 'Tarjetas de gastos e ingresos por proyecto con desglose detallado' },
            { type: 'added', description: 'Widget de seguimiento de tiempo (TimeTracking) por proyecto' },
            { type: 'added', description: 'Editor de texto enriquecido (Rich Text con TipTap) para documentación de proyecto' },
            { type: 'added', description: 'Notificaciones por email al cambiar estado del proyecto con templates configurables' },
            { type: 'added', description: 'Wizard de creación de proyecto paso a paso' },

            // ─── Reportes ───
            { type: 'added', description: 'Reporte financiero completo con filtros de período y distribución por categoría' },
            { type: 'added', description: 'Reporte ERP independiente con métricas de servicios, clientes y proyectos' },
            { type: 'added', description: 'Componentes reutilizables de reporte: ReportCard, ReportFilters, CategoryList' },

            // ─── Asistente IA ───
            { type: 'added', description: 'Chat integrado con OpenAI GPT para consultas financieras contextuales' },
            { type: 'added', description: 'Reconocimiento de voz: dictado de comandos y consultas' },
            { type: 'added', description: 'Adjuntos de documentos: recibos, cartolas bancarias, facturas, imágenes' },
            { type: 'added', description: 'Function calling para ejecución de acciones automatizadas desde el chat' },
            { type: 'added', description: 'Extracción inteligente de movimientos desde documentos adjuntos' },

            // ─── Notificaciones ───
            { type: 'added', description: 'Centro de notificaciones con dropdown integrado en el header' },
            { type: 'added', description: 'Preferencias de notificación configurables: préstamos, proyecciones, saldo bajo' },
            { type: 'added', description: 'Configuración SMTP para notificaciones por email (API key, from email, templates)' },

            // ─── Configuración ───
            { type: 'added', description: 'Panel general de entidad: nombre, tipo, icono, color, logo' },
            { type: 'added', description: 'Gestión de cajas: crear, editar, eliminar, reordenar, establecer default, asignar moneda' },
            { type: 'added', description: 'Panel de categorías con gestión completa de subcategorías' },
            { type: 'added', description: 'Configuración de apariencia: tema claro/oscuro' },
            { type: 'added', description: 'Panel de módulos: toggle de activación del ERP' },
            { type: 'added', description: 'Configuración avanzada del sistema' },
            { type: 'added', description: 'Configuración de cuenta de usuario' },

            // ─── UX y Navegación ───
            { type: 'added', description: 'Cabecera contextual dinámica: métricas y acciones adaptadas a cada sección' },
            { type: 'added', description: 'Sidebar de navegación completa con responsive design y colapso en móvil' },
            { type: 'added', description: 'Quick Actions y FullScreen Quick Actions para acceso rápido a funciones frecuentes' },
            { type: 'added', description: 'Modo Privacidad global: oculta saldos y montos sensibles con un clic (persistente entre sesiones)' },
            { type: 'added', description: 'Indicador de estado de conexión en tiempo real' },
            { type: 'added', description: 'Historial de Cambios (Changelog) como página dedicada con timeline visual' },
            { type: 'added', description: 'Estadísticas del proyecto visibles: líneas de código (LOC) y horas de desarrollo' },

            // ─── Integraciones ───
            { type: 'added', description: 'Supabase completo: Auth (OAuth Google), Postgres, Storage (logos, adjuntos), Realtime' },
            { type: 'added', description: 'OpenAI GPT: asistente IA con function calling y procesamiento de documentos' },
            { type: 'added', description: 'Indicadores económicos Chile en tiempo real: UF, Dólar, Euro' },
            { type: 'added', description: 'Parser de cartolas bancarias BCI (extensible a Santander y otros)' },
            { type: 'added', description: 'Despliegue automatizado mediante SFTP' },
        ]
    }
];
