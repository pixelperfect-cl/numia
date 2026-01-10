# Guía de Versionado y Changelog - Numia

Esta guía establece el estándar para el manejo de versiones y el registro de cambios en el proyecto Numia.

## Sistema de Versionado

Utilizamos [Semantic Versioning 2.0.0](https://semver.org/lang/es/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Cambios incompatibles con la API anterior (Breaking Changes).
- **MINOR**: Nuevas funcionalidades compatibles hacia atrás (New Features).
- **PATCH**: Corrección de errores compatibles hacia atrás (Bug Fixes).

### Sufijos de Pre-lanzamiento

Para versiones en desarrollo o prueba, utilizamos sufijos:
- `-beta`: Funcionalidad completa pero requiere pruebas exhaustivas.
- `-alpha`: Desarrollo temprano, inestable.
- `-rc`: Release Candidate, potencial versión final.

Ejemplo: `1.0.0-beta`

## Proceso de Actualización

Cuando se realiza un cambio significativo en el código (Release), se deben seguir los siguientes pasos:

1.  **Actualizar `package.json`**: Incrementar el número de versión en el archivo `package.json`.
2.  **Actualizar Changelog**: Agregar una nueva entrada en `src/data/changelog.ts` describiendo los cambios.
    *   El changelog debe ser descriptivo y orientado al usuario/desarrollador.
    *   Clasificar cambios en: `added` (nuevo), `changed` (modificado), `fixed` (arreglado), `removed` (eliminado).
3.  **Generar Tag de Git**: Crear un tag en git coincidiendo con la versión.
    ```bash
    git tag -a v1.0.0-beta -m "Release v1.0.0-beta"
    git push origin v1.0.0-beta
    ```

## Estructura del Changelog (`src/data/changelog.ts`)

El changelog se mantiene programáticamente para poder mostrarlo dentro de la aplicación.

```typescript
export interface ChangeLogEntry {
  version: string;
  date: string; // ISO format YYYY-MM-DD
  changes: {
    type: 'added' | 'changed' | 'fixed' | 'removed';
    description: string;
  }[];
}
```

## Estadísticas del Proyecto

El panel de versionado muestra estadísticas vitales:
- **Líneas de Código (LOC)**: Se debe actualizar manualmente o mediante script en el componente `ChangelogDialog` si hay cambios masivos.
- **Horas de Desarrollo**: Estimación del esfuerzo invertido, actualizar periódicamente.
