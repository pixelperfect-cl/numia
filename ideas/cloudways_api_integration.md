# Integración API Cloudways

**Estado:** Idea / Investigación

## Descripción
Integrar la API v2 de Cloudways para gestión automatizada de infraestructura directamente desde el ERP.

**Funcionalidades Propuestas:**
1.  **Dashboard de Infraestructura:** Ver estado de servidores, uso de recursos (CPU, RAM) y backups.
2.  **Acciones Rápidas:** Reiniciar servicios (PHP, Nginx), limpiar caché, gestionar SSL.
3.  **Suspensión Automática:** Deshabilitar aplicaciones de clientes morosos automáticamente (toggle `autoSuspend`).
4.  **Despliegues Git:** Disparar pull requests o deploys desde la interfaz de proyectos.

**Detalles Técnicos:**
- Usar Supabase Edge Functions como proxy para proteger las API Keys.
- Endpoint clave: `change_app_access_state` para suspender/activar sitios.
- Sincronización de costos de servidores para cálculo de márgenes.
