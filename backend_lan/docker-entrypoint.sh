#!/bin/sh
set -e

echo "[entrypoint] Esperando que PostgreSQL esté disponible..."
MAX_ATTEMPTS=30
ATTEMPT=0

until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(os.environ.get('DATABASE_URL', ''))
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        echo "[entrypoint] ERROR: PostgreSQL no respondió después de $MAX_ATTEMPTS intentos. Abortando."
        exit 1
    fi
    echo "[entrypoint] Intento $ATTEMPT/$MAX_ATTEMPTS - reintentando en 2s..."
    sleep 2
done

echo "[entrypoint] PostgreSQL disponible. Aplicando migraciones..."
alembic upgrade head

echo "[entrypoint] Inicializando usuarios por defecto..."
python init_users.py

echo "[entrypoint] Iniciando servidor..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
