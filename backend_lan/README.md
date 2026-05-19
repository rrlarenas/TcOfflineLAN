# TrakCare Offline LAN - Backend v1.9.2-rc08

Backend LAN del sistema TrakCare Offline. Variante del backend local diseñada para despliegue en red de área local (LAN), con PostgreSQL compartido, autenticación JWT y soporte multi-usuario session-safe.

## Diferencias respecto al backend local (`app/`)

| Característica | `app/` (local) | `backend_lan/` (LAN) |
|---|---|---|
| Base de datos | SQLite (archivo local) | PostgreSQL (compartido en red) |
| Autenticación | Basic Auth | JWT Bearer Token |
| Sesiones | Un usuario a la vez | Multi-usuario concurrente |
| Despliegue | Por estación | Servidor central de área local |
| Puerto por defecto | 8000 | 8000 (configurable) |

## Requisitos

- Python 3.12+
- PostgreSQL 14+

## Instalación

### 1. Preparar la base de datos PostgreSQL

Ejecutar como superusuario de PostgreSQL:

```sql
CREATE DATABASE tcoffline;
CREATE USER tcoffline WITH PASSWORD 'tcoffline';
GRANT ALL PRIVILEGES ON DATABASE tcoffline TO tcoffline;
```

### 2. Configurar variables de entorno

```bash
cd backend_lan
cp .env.example .env
```

Editar `.env` con los valores reales:

```env
DATABASE_URL=postgresql://tcoffline:tcoffline@<IP_SERVIDOR>:5432/tcoffline
SECRET_KEY=<clave-aleatoria-larga>
CENTRAL_URL=http://<servidor-central>
CENTRAL_API_USERNAME=<usuario>
CENTRAL_API_PASSWORD=<password>
```

### 3. Setup automático

#### Windows
```bash
setup-backend-lan.bat
```

#### Linux/Mac
```bash
chmod +x setup-backend-lan.sh
./setup-backend-lan.sh
```

El script:
1. Crea entorno virtual Python en `backend_lan/venv/`
2. Instala dependencias desde `requirements.txt`
3. Aplica migraciones Alembic sobre PostgreSQL
4. Crea usuarios iniciales (admin/admin123, demo/demo123)

### 4. Iniciar el servidor

```bash
# Activar entorno virtual
source backend_lan/venv/bin/activate      # Linux/Mac
backend_lan\venv\Scripts\activate.bat     # Windows

# Iniciar
cd backend_lan
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

La API queda disponible en:
- **API:** `http://<IP_SERVIDOR>:8000`
- **Docs:** `http://<IP_SERVIDOR>:8000/docs`

## Autenticación

Este backend usa **JWT Bearer Token** (no Basic Auth).

### Obtener token

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Respuesta:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "username": "admin", ... }
}
```

### Usar el token

Incluir en todas las peticiones:
```http
Authorization: Bearer eyJ...
```

Los tokens expiran en 480 minutos (8 horas) por defecto. Configurable con `ACCESS_TOKEN_EXPIRE_MINUTES`.

## API Endpoints

### Autenticación
- `POST /auth/login` — Obtener token JWT
- `GET /auth/me` — Usuario actual
- `PUT /auth/me` — Actualizar usuario actual
- `GET /auth/users` — Listar usuarios (solo admin)
- `POST /auth/users` — Crear usuario (solo admin)

### Episodios
- `GET /episodes` — Lista episodios con filtros del usuario
- `GET /episodes/types/unique` — Tipos de episodio únicos
- `GET /episodes/locations/unique` — Ubicaciones únicas
- `GET /episodes/{id}` — Detalle del episodio con JSON completo
- `POST /episodes` — Crear nuevo episodio
- `PUT /episodes/{id}` — Actualizar episodio
- `DELETE /episodes/{id}` — Eliminar episodio

### Notas Clínicas
- `POST /episodes/{id}/notes` — Crear nota clínica
- `GET /episodes/{id}/notes` — Listar notas del episodio
- `GET /episodes/{id}/notes/{note_id}` — Obtener nota específica

### Sincronización
- `GET /sync/status` — Estado detallado
- `GET /sync/stats` — Estadísticas de outbox
- `GET /sync/connection-status` — Estado de conexión
- `POST /sync/trigger` — Sincronización manual
- `POST /sync/retry-failed` — Reintentar eventos fallidos
- `POST /sync/from-central` — Solo downstream

### Sistema
- `GET /health` — Health check local
- `GET /health/central` — Conectividad con central
- `GET /settings` — Configuración global
- `PUT /settings` — Actualizar configuración (solo admin)

## Migraciones

```bash
cd backend_lan

# Aplicar todas las migraciones
alembic upgrade head

# Ver historial
alembic history

# Crear nueva migración
alembic revision -m "descripcion_del_cambio"
```

### Migraciones actuales

| # | Archivo | Descripción |
|---|---|---|
| 000 | `000_base.py` | Revisión base vacía |
| 001 | `001_initial_postgres_schema.py` | Schema completo inicial (PostgreSQL con timestamps timezone-aware) |
| 002 | `002_fix_data_json_to_text.py` | Corrige tipo de columna data_json a TEXT |

## Seguridad de Sesión

El backend está diseñado para ser **session-safe** en entorno multi-usuario:

- **JWT revalidado en cada request:** El `user_id` del token se verifica siempre contra la base de datos. No se confía ciegamente en el payload del JWT.
- **`author_user_id` en OutboxEvent:** Cada evento de sincronización guarda el ID del usuario que lo creó. El procesador de outbox usa este campo para poblar el campo `user` en el HL7 (OBR.24), garantizando que el mensaje enviado al servidor central identifica correctamente al profesional que realizó la acción.
- **Filtros por usuario:** El listado de episodios aplica los filtros personalizados de `current_user` (Hospital, Tipo, Ubicación, Profesional), que siempre vienen del token autenticado, nunca de parámetros externos.

## Estructura

```
backend_lan/
├── app/
│   ├── main.py              # Aplicación FastAPI, startup events
│   ├── models.py            # Modelos SQLAlchemy (PostgreSQL)
│   ├── schemas.py           # Schemas Pydantic
│   ├── settings.py          # Variables de entorno (pydantic-settings)
│   ├── auth_utils.py        # JWT: generación y validación de tokens
│   ├── dependencies.py      # Dependencias FastAPI (get_current_user)
│   ├── db.py                # Conexión y sesión PostgreSQL
│   ├── background_tasks.py  # Scheduler de sync y health monitoring
│   ├── sync_service.py      # Health checker y sync downstream
│   ├── outbox_processor.py  # Procesador de eventos → HL7 upstream
│   ├── hl7_builder.py       # Generador de mensajes HL7
│   ├── config/              # i18n (es/en)
│   └── routers/
│       ├── auth.py          # Login JWT, gestión de usuarios
│       ├── episodes.py      # CRUD de episodios
│       ├── notes.py         # CRUD de notas clínicas
│       ├── sync.py          # Endpoints de sincronización
│       └── general.py       # Health checks, settings
├── alembic/                 # Migraciones de base de datos
│   └── versions/
├── init_users.py            # Script de inicialización de usuarios
├── requirements.txt
├── .env.example
├── setup-backend-lan.bat    # Setup Windows
└── setup-backend-lan.sh     # Setup Linux/Mac
```

## Variables de Entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://trakcare:trakcare@localhost:5432/trakcare_lan` | Cadena de conexión PostgreSQL |
| `SECRET_KEY` | *(cambiar en producción)* | Clave para firmar JWTs |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Expiración del token (minutos) |
| `CENTRAL_URL` | `http://demo01...` | URL base del servidor central |
| `CENTRAL_API_ENDPOINT` | `/demo01/tcoffline/getData` | Endpoint de descarga de datos |
| `CENTRAL_HL7_ENDPOINT` | `/demo01/tcoffline/hl7inbound` | Endpoint de recepción HL7 |
| `CENTRAL_API_USERNAME` | `demo` | Usuario API del central |
| `CENTRAL_API_PASSWORD` | `demodemo` | Contraseña API del central |
| `HEALTH_CHECK_INTERVAL` | `8` | Intervalo de health check (segundos) |
| `DOWNSTREAM_SYNC_INTERVAL` | `60` | Intervalo de sync downstream (segundos) |
| `UPSTREAM_SYNC_INTERVAL` | `10` | Intervalo de sync upstream (segundos) |
| `MAX_RETRIES` | `5` | Máximo de reintentos por evento outbox |
| `DEFAULT_LANGUAGE` | `es` | Idioma por defecto (es/en) |
| `ENVIRONMENT` | `development` | Entorno de ejecución |

## Solución de Problemas

### No se puede conectar a PostgreSQL

Verificar que el servicio PostgreSQL está corriendo y que la `DATABASE_URL` en `.env` es correcta:

```bash
psql postgresql://tcoffline:tcoffline@<IP>:5432/tcoffline -c "SELECT 1"
```

### Error de migración al iniciar

Si la base de datos ya existe con un esquema anterior, aplicar migraciones manualmente:

```bash
cd backend_lan
alembic upgrade head
```

### Tokens JWT expirados

El frontend debe manejar el error 401 y solicitar nuevo login. El tiempo de expiración se configura con `ACCESS_TOKEN_EXPIRE_MINUTES`.

### Logs ruidosos con `HTTP/1.1 404` del servidor central

El health check hace una petición `HEAD` al servidor central cada 8 segundos. Si el servidor responde con 404 (la raíz no existe pero el servicio funciona), el sistema igual marca la conexión como activa (cualquier respuesta `< 500` es válida). El log de httpx está silenciado durante el health check para evitar este ruido.
