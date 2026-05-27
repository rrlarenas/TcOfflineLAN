#!/bin/bash
# =============================================================================
# TrakCare Backend LAN - Build y despliegue de imagen Docker
# =============================================================================
# Uso:
#   ./docker-build-deploy.sh                          # Solo build local
#   ./docker-build-deploy.sh --deploy user@host       # Build + transferir + levantar
#   ./docker-build-deploy.sh --deploy user@host --port 22  # SSH en puerto alternativo
# =============================================================================

set -e

IMAGE_NAME="trakcare-backend-lan"
IMAGE_TAG="${IMAGE_TAG:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
ARCHIVE="${IMAGE_NAME}-${IMAGE_TAG}.tar.gz"
REMOTE_DIR="/opt/trakcare-backend-lan"
SSH_PORT=22
DEPLOY=false
REMOTE_HOST=""

# ── Parsear argumentos ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --deploy)
            DEPLOY=true
            REMOTE_HOST="$2"
            shift 2
            ;;
        --port)
            SSH_PORT="$2"
            shift 2
            ;;
        --tag)
            IMAGE_TAG="$2"
            FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
            ARCHIVE="${IMAGE_NAME}-${IMAGE_TAG}.tar.gz"
            shift 2
            ;;
        --help|-h)
            sed -n '2,8p' "$0" | sed 's/^# //'
            exit 0
            ;;
        *)
            echo "Argumento desconocido: $1"
            exit 1
            ;;
    esac
done

SSH_OPTS="-p ${SSH_PORT} -o StrictHostKeyChecking=no"

echo "=============================================="
echo " TrakCare Backend LAN - Docker Build"
echo " Imagen : ${FULL_IMAGE}"
echo " Archivo: ${ARCHIVE}"
echo "=============================================="

# ── 1. Build ──────────────────────────────────────────────────────────────────
echo ""
echo "[1/4] Construyendo imagen Docker..."
docker build \
    --no-cache \
    --platform linux/amd64 \
    -t "${FULL_IMAGE}" \
    -f Dockerfile \
    .

echo "      Imagen construida: $(docker image inspect ${FULL_IMAGE} --format '{{.Size}}' | numfmt --to=iec 2>/dev/null || echo 'OK')"

# ── 2. Exportar ───────────────────────────────────────────────────────────────
echo ""
echo "[2/4] Exportando imagen a ${ARCHIVE}..."
docker save "${FULL_IMAGE}" | gzip > "${ARCHIVE}"
echo "      Tamaño del archivo: $(du -sh ${ARCHIVE} | cut -f1)"

if [ "$DEPLOY" = false ]; then
    echo ""
    echo "Build completado. Archivo listo: ${ARCHIVE}"
    echo ""
    echo "Para cargar manualmente en el servidor:"
    echo "  scp -P ${SSH_PORT} ${ARCHIVE} user@servidor:${REMOTE_DIR}/"
    echo "  ssh -p ${SSH_PORT} user@servidor 'cd ${REMOTE_DIR} && gunzip -c ${ARCHIVE} | docker load && docker compose up -d'"
    exit 0
fi

# ── 3. Transferir al servidor ─────────────────────────────────────────────────
echo ""
echo "[3/4] Transfiriendo imagen a ${REMOTE_HOST}..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}"
scp -P "${SSH_PORT}" "${ARCHIVE}"          "${REMOTE_HOST}:${REMOTE_DIR}/"
scp -P "${SSH_PORT}" "docker-compose.yml"  "${REMOTE_HOST}:${REMOTE_DIR}/"

# Transferir .env si existe
if [ -f ".env" ]; then
    scp -P "${SSH_PORT}" ".env" "${REMOTE_HOST}:${REMOTE_DIR}/"
    echo "      .env transferido"
else
    echo "      AVISO: no se encontró .env local. Asegúrese de que exista en ${REMOTE_DIR}/.env en el servidor."
fi

# ── 4. Cargar y levantar en el servidor ───────────────────────────────────────
echo ""
echo "[4/4] Cargando imagen y levantando servicio en ${REMOTE_HOST}..."
ssh ${SSH_OPTS} "${REMOTE_HOST}" bash <<EOF
set -e
cd ${REMOTE_DIR}

echo "  Cargando imagen desde ${ARCHIVE}..."
gunzip -c "${ARCHIVE}" | docker load

echo "  Deteniendo contenedores anteriores (si existen)..."
docker compose down --remove-orphans 2>/dev/null || true

echo "  Levantando servicios..."
docker compose up -d

echo "  Estado:"
docker compose ps
EOF

echo ""
echo "=============================================="
echo " Despliegue completado."
echo " API disponible en: http://${REMOTE_HOST%%:*}:8000"
echo " Docs:              http://${REMOTE_HOST%%:*}:8000/docs"
echo "=============================================="
