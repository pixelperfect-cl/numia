# Guía de Gestión de Base de Datos (Firebase Firestore)

Este documento sirve como referencia para cualquier agente o desarrollador que necesite realizar cambios en la estructura de la base de datos o añadir nuevas funcionalidades que requieran persistencia de datos.

## Principios Fundamentales

1.  **Multi-tenancy por Defecto**:
    *   Todos los documentos raíz *deben* tener un campo `userId` que corresponda al UID del usuario autenticado.
    *   Las reglas de seguridad (`firestore.rules`) se basan en este campo para permitir el acceso (`isOwner(resource.data.userId)`).
    *   *Nunca* confíes en filtros del lado del cliente para la seguridad; la seguridad debe estar en las reglas.

2.  **Schema Implícito (TypeScript)**:
    *   Aunque Firestore es NoSQL, tratamos la base de datos como si tuviera un esquema estricto definido por los tipos en `src/types/index.ts`.
    *   **Regla de Oro**: Si añades un campo a la base de datos, *debes* añadirlo a la interfaz correspondiente en `src/types/index.ts`.

3.  **Compatibilidad Hacia atrás**:
    *   Nunca renombres o elimines campos existentes si la aplicación ya está en producción, a menos que tengas un plan de migración claro.
    *   Preferencia: Añadir nuevos campos opcionales (`?`) en lugar de modificar los obligatorios.
    *   Si deprecas un campo, márcalo en `src/types/index.ts` con un comentario `// DEPRECATED`.

## Convenciones de Nombres

*   **Colecciones**: `snake_case` y plural.
    *   Ejemplo: `entities`, `movements`, `clients`, `service_definitions`.
*   **Campos**: `camelCase` (para coincidir con las convenciones de JavaScript/TypeScript).
    *   Ejemplo: `userId`, `entityId`, `billingPeriod`, `createdAt`.
*   **Fechas**:
    *   Usa `Date` nativo de JavaScript en los tipos de TypeScript (`createdAt: Date`).
    *   En Firestore se guardan como `Timestamp`. La conversión debe manejarse en la capa de servicio/API.
    *   Para fechas lógicas (ej. fecha de vencimiento sin hora), usa strings en formato ISO (`YYYY-MM-DD`) para facilitar consultas y ordenamiento.

## Gestión de Índices

*   Si añades consultas compuestas (ej. `where('userId', '==', ...).orderBy('date')`), es probable que necesites un índice compuesto.
*   Firestore generará un error con un enlace para crear el índice. Sigue el enlace, crea el índice, y luego **actualiza** el archivo `firestore.indexes.json` en el repositorio para mantener la infraestructura como código.

## Estructura de Colecciones (Referencia)

Estructura actual (consultar `firestore.rules` para la verdad absoluta):

*   `/entities/{entityId}`
*   `/movements/{movementId}`: Movimientos financieros.
*   `/loans/{loanId}`
*   `/projections/{projectionId}`
*   `/categories/{categoryId}`
*   `/users/{userId}/preferences/{preferenceId}`: Preferencias de usuario (subcolección).
*   `/notifications/{notificationId}`
*   **ERP**:
    *   `/clients/{clientId}`
    *   `/subscriptions/{subscriptionId}` (No anidado en clients, referencia por `clientId`)
    *   `/projects/{projectId}`
    *   `/service_definitions/{definitionId}`

## Flujo de Trabajo para Nuevas Funcionalidades

1.  **Definir Tipos**: Actualizar `src/types/index.ts` con la nueva interfaz o campos.
2.  **Actualizar Reglas**: Si es una colección nueva, añadir bloques `match` en `firestore.rules`.
3.  **Actualizar Índices**: Si es necesario.
4.  **Implementación**: Crear los servicios de Firebase para interactuar con los datos.
