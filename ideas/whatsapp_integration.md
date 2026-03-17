# Integración WhatsApp (Evolution API / WAHA)

**Estado:** Idea / Investigación

## Descripción
Opción "gratis" pero técnica para notificaciones de WhatsApp.

**Cómo funciona:** 
Instalas un contenedor Docker en tu servidor (VPS) que ejecuta una versión de WhatsApp Web controlable por API.

**Integración:** 
Requiere levantar un pequeño servidor con Docker. Luego la API es muy simple.

**Pros:**
- Sin costo mensual por mensajes o suscripción (solo tu servidor).
- Control total de los datos.

**Contras:**
- Requiere mantener un servidor (VPS).
- Si envías spam masivo te pueden bloquear el número (para notificaciones de cobro a clientes reales no suele haber problema).
