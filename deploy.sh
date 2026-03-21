#!/bin/bash
# deploy.sh — Despliegue rápido de Numia desde el servidor vía SSH
# Uso: ssh antig@149.28.200.205 'bash ~/deploy.sh'
# O directamente en el servidor: bash ~/deploy.sh

set -e

# ─── Configuración ───
APP_DIR="$HOME/numia"
PUBLIC_DIR="$HOME/public_html"

echo "🚀 Iniciando deploy de Numia..."

# ─── 1. Pull últimos cambios ───
echo "📥 Pulling latest changes..."
cd "$APP_DIR"
git pull origin master

# ─── 2. Instalar dependencias (solo si hay cambios en package.json) ───
if git diff HEAD~1 --name-only | grep -q "package.json\|package-lock.json"; then
    echo "📦 Instalando dependencias actualizadas..."
    npm ci --production=false
else
    echo "📦 Dependencias sin cambios, omitiendo npm install"
fi

# ─── 3. Build ───
echo "🔨 Building production bundle..."
npx vite build

# ─── 4. SPA fallback ───
echo "📄 Creando 404.html fallback para SPA..."
cp dist/index.html dist/404.html

# ─── 5. Sincronizar con public_html ───
echo "📂 Sincronizando dist → public_html..."
rsync -av --delete --exclude='.htaccess' dist/ "$PUBLIC_DIR/"

# ─── 6. Copiar .htaccess si existe ───
if [ -f ".htaccess" ]; then
    cp .htaccess "$PUBLIC_DIR/.htaccess"
    echo "✅ .htaccess copiado"
fi

echo ""
echo "✅ Deploy completado exitosamente!"
echo "🕐 $(date '+%Y-%m-%d %H:%M:%S')"
