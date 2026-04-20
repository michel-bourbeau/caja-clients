#!/bin/bash

# Script de verificación de instalación
# Verifica que todo el proyecto esté correctamente configurado

echo "🔍 Verificando instalación de Caja POS..."
echo ""

# Verificar Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js no instalado"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm no instalado"
    exit 1
fi

# Verificar node_modules
if [ -d "node_modules" ]; then
    echo "✅ Dependencias instaladas"
else
    echo "⚠️  node_modules no encontrado, ejecutando: npm install"
    npm install
fi

# Verificar archivos importantes
echo ""
echo "📁 Verificando estructura de carpetas..."

folders=(
    "src/app/dashboard"
    "src/components"
    "src/context"
    "src/features"
    "src/lib/types"
    "src/lib/utils"
    "src/lib/constants"
)

for folder in "${folders[@]}"; do
    if [ -d "$folder" ]; then
        echo "✅ $folder"
    else
        echo "❌ $folder no encontrado"
    fi
done

# Verificar archivos de documentación
echo ""
echo "📚 Verificando documentación..."

files=(
    "README.md"
    "QUICKSTART.md"
    "DEVELOPMENT.md"
    "ARCHITECTURE.md"
    "PROJECT_STRUCTURE.md"
    ".env.example"
    ".prettierrc"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "⚠️  $file no encontrado"
    fi
done

echo ""
echo "🎉 Verificación completada!"
echo ""
echo "📖 Para empezar:"
echo "  npm run dev"
echo ""
echo "📚 Documentación:"
echo "  - QUICKSTART.md"
echo "  - DEVELOPMENT.md"
echo "  - ARCHITECTURE.md"
