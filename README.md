# Numia v1.0

Aplicación de gestión financiera personal y empresarial construida con React, TypeScript, Shadcn UI y Firebase.

## 🚀 Tecnologías

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Shadcn UI** - Component System
- **Tailwind CSS** - Styling
- **Firebase** - Backend + Auth + Database

## 📦 Características

- ✅ Autenticación con Google
- ✅ Gestión de entidades (personal/empresarial)
- ✅ Sistema de cajas (cuentas bancarias, efectivo, etc.)
- ✅ Movimientos (ingresos y gastos)
- ✅ Préstamos (debo/me deben)
- ✅ Proyección financiera
- ✅ Modo oscuro/claro
- ✅ Responsive design

## 🛠️ Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

1. Crear un nuevo proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Authentication → Google Sign-in
3. Crear base de datos Firestore
4. Copiar las credenciales de configuración

### 3. Variables de entorno

Crear archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Completar con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### 4. Configurar Firestore Security Rules

En Firebase Console → Firestore → Rules, copiar el contenido de `firestore.rules`

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173)

## 📁 Estructura del Proyecto

```
numiashad/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn components
│   │   ├── theme-provider.tsx
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   ├── lib/
│   │   ├── firebase/        # Firebase config + functions
│   │   │   ├── config.ts
│   │   │   ├── auth.ts
│   │   │   └── database.ts
│   │   └── utils.ts         # Utility functions
│   ├── pages/
│   │   ├── Login.tsx
│   │   └── Dashboard.tsx
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── firestore.rules
├── package.json
└── README.md
```

## 🔒 Seguridad

- Autenticación requerida para todas las operaciones
- Datos aislados por usuario (userId)
- Security rules de Firestore por usuario
- Variables de entorno no incluidas en el repositorio

## 📝 Licencia

Proyecto personal - Todos los derechos reservados
