#!/bin/bash
# ============================================================================
# TrakCare LAN Backend v1.9.2-rc08 - Setup Script (Linux/macOS)
# ============================================================================

set -e

echo ""
echo "============================================================================"
echo "TrakCare LAN Backend v1.9.2-rc08 - Setup"
echo "============================================================================"
echo ""

# Verificar Python
echo "[1/6] Verificando Python..."
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python3 no encontrado"
    exit 1
fi
python3 --version
echo "      OK - Python encontrado"
echo ""

# Crear entorno virtual
echo "[2/6] Creando entorno virtual..."
if [ -d "venv" ]; then
    echo "      Eliminando entorno virtual existente..."
    rm -rf venv
fi
python3 -m venv venv
source venv/bin/activate
echo "      OK - Entorno virtual creado y activado"
echo ""

# Instalar dependencias
echo "[3/6] Instalando dependencias Python..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "      OK - Dependencias instaladas"
echo ""

# Configurar .env
echo "[4/6] Configurando variables de entorno..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "      OK - Archivo .env creado desde .env.example"
        echo "      IMPORTANTE: Editar .env con tus valores reales"
    fi
else
    echo "      OK - Archivo .env ya existe"
fi
echo ""

# Verificar conexion PostgreSQL antes de migrar
echo "[5/6] Verificando conexion a PostgreSQL y ejecutando migraciones..."

# Extraer host y puerto desde DATABASE_URL en .env
if [ -f ".env" ]; then
    DB_URL_LINE=$(grep -E '^DATABASE_URL\s*=' .env | head -1)
    PG_HOST=$(echo "$DB_URL_LINE" | python3 -c "import sys,re; m=re.search(r'@([^:/]+)', sys.stdin.read()); print(m.group(1) if m else 'localhost')" 2>/dev/null)
    PG_PORT=$(echo "$DB_URL_LINE" | python3 -c "import sys,re; m=re.search(r'@[^:/]+:(\d+)', sys.stdin.read()); print(m.group(1) if m else '5432')" 2>/dev/null)
fi
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"

# Intentar conexion TCP al host/puerto extraido
PG_CHECK=1
if command -v nc &>/dev/null; then
    nc -z -w3 "$PG_HOST" "$PG_PORT" 2>/dev/null && PG_CHECK=0
elif command -v python3 &>/dev/null; then
    python3 -c "import socket; s=socket.socket(); s.settimeout(3); s.connect(('$PG_HOST',$PG_PORT)); s.close()" 2>/dev/null && PG_CHECK=0
else
    PG_CHECK=0  # no se puede verificar, continuar
fi

if [ $PG_CHECK -ne 0 ]; then
    echo ""
    echo "[ERROR] No se puede conectar a PostgreSQL en ${PG_HOST}:${PG_PORT}"
    echo ""
    echo " Verifica que el servidor PostgreSQL este accesible desde esta maquina."
    echo " Si el host/puerto son incorrectos, edita DATABASE_URL en .env"
    echo ""
    echo " Una vez que PostgreSQL este accesible, ejecuta manualmente:"
    echo "   source venv/bin/activate"
    echo "   alembic upgrade head"
    echo "   python3 init_users.py"
    echo ""
    exit 1
fi
echo "      OK - PostgreSQL accesible en ${PG_HOST}:${PG_PORT}"

alembic upgrade head
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] No se pudieron aplicar las migraciones"
    echo ""
    echo " Posibles causas:"
    echo " - La base de datos no existe en el servidor PostgreSQL"
    echo " - Credenciales incorrectas en DATABASE_URL del archivo .env"
    echo ""
    exit 1
fi
echo "      OK - Migraciones aplicadas"
echo ""

# Crear usuarios iniciales
echo "[6/6] Creando usuarios iniciales..."
python3 init_users.py
echo ""

echo "============================================================================"
echo "SETUP COMPLETADO EXITOSAMENTE!"
echo "============================================================================"
echo ""
echo "PROXIMOS PASOS:"
echo ""
echo "1. Activar entorno virtual:"
echo "   source venv/bin/activate"
echo ""
echo "2. Iniciar servidor backend LAN:"
echo "   uvicorn app.main:app --reload --reload-exclude 'frontend/*' --host 0.0.0.0 --port 8001"
echo ""
echo "3. API Docs: http://localhost:8001/docs"
echo ""
echo "CREDENCIALES INICIALES:"
echo "   Admin: admin / admin"
echo "   Demo:  demo / demo"
echo ""
echo "IMPORTANTE: Cambiar contrasenas en produccion."
echo "============================================================================"
echo ""
