# [E]ntity v1.0

Aplicación de gestión financiera personal y empresarial + ERP de clientes/servicios, construida con React 19, TypeScript, Shadcn UI y Supabase.

## 🚀 Tecnologías

- **React 19** + **TypeScript**
- **Vite** (build)
- **Shadcn UI** + **Tailwind CSS v4**
- **Supabase** (auth, base de datos Postgres, storage, realtime, edge functions)
- **Anthropic Claude** vía Supabase Edge Function (asistente IA)
- **ElasticEmail** vía Supabase Edge Function (envío de cobros)

## 📦 Características

> [!IMPORTANT]
> **Para Desarrolladores y Agentes AI**: antes de cambiar la base de datos lee [DATABASE_GUIDELINES.md](DATABASE_GUIDELINES.md).

- Auth con Google + email/password (Supabase)
- Multi-entidad (personal/empresarial) con cajas, movimientos, préstamos, proyecciones, suscripciones-gasto
- ERP: clientes, servicios recurrentes (CLP / UF, mensual / anual), proyectos con kanban
- Asistente IA con tool calling (Anthropic)
- Notificaciones por email automatizadas (ElasticEmail)
- Modo oscuro/claro, responsive

## 🔄 Versionado

Semantic Versioning. Ver [VERSIONING_GUIDE.md](./VERSIONING_GUIDE.md).

## 🛠️ Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crear proyecto en [Supabase](https://app.supabase.com).
2. Habilitar provider Google en Authentication.
3. Aplicar las migraciones en `supabase/migrations/` (Dashboard → SQL Editor).
4. Configurar RLS según `supabase/migrations/*_rls.sql`.

### 3. Variables de entorno (frontend)

```bash
cp .env.example .env
```

Completar:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Secrets de servidor (edge functions)

Los siguientes secretos NO se exponen al cliente; configurarlos vía Supabase CLI:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ELASTICEMAIL_API_KEY=...
```

### 5. Desplegar edge functions

```bash
supabase functions deploy ai-chat
supabase functions deploy send-billing-email
supabase functions deploy test-elasticemail
```

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

## 🔒 Seguridad

- Todas las tablas tienen RLS activa por `user_id = auth.uid()` (ver `supabase/migrations`).
- API keys de terceros (Anthropic, ElasticEmail) viven en secretos del servidor.
- Variables `VITE_*` son las únicas que el bundle expone al navegador.

## 📝 Licencia

Proyecto personal — Todos los derechos reservados.
