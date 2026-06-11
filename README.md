# TrakCare Offline Local v2.9.0-rc2

Sistema offline para gestión de episodios clínicos con sincronización bidireccional con servidor central.

## Características

- Gestión offline de episodios clínicos
- Almacenamiento de JSON completo con antecedentes del paciente
- Sincronización bidireccional automática con servidor central vía HL7
- Interfaz web React + TypeScript con modo oscuro
- Autenticación y autorización
- Sistema de outbox para garantizar entrega de mensajes
- Soporte multiidioma (Español/English)

## Arquitectura

El sistema utiliza una **arquitectura de tabla única** para máxima simplicidad y soporta dos variantes de backend:

| Componente | Modo | Base de Datos | Autenticación | Usuarios |
|---|---|---|---|---|
| `app/` | Por estación | SQLite | Basic Auth | 1 estación |
| `backend_lan/` | Red local | PostgreSQL | JWT Bearer | Multi-usuario |

### Backend `app/` (por estación)
- SQLite local, sin dependencias externas
- Basic Auth (usuario:contraseña en base64)
- Ideal para instalación de escritorio individual

### Backend `backend_lan/` (red local)
- PostgreSQL con pool de conexiones (multi-usuario concurrente)
- OAuth2 Password Flow con tokens JWT (HS256, 480 min)
- **Sincronización de usuarios desde el servidor central**: los usuarios del sistema TrakCare central se importan automáticamente y sus contraseñas se verifican usando el mismo algoritmo PBKDF2 del central (ver sección [Sincronización de Usuarios](#sincronización-de-usuarios-backend-lan))
- Session-safety: cada evento outbox registra el `author_user_id` para trazabilidad correcta del profesional en HL7
- Despliegue recomendado: Docker (ver `backend_lan/docker-compose.yml`)

### Patrones comunes a ambos backends
- Tabla `episodes` con campos indexados + JSON completo en `data_json`
- Sincronización rápida mediante upsert
- Historia completa del paciente incluida en el JSON (Antecedentes)
- Queries eficientes con índices en campos clave
- Patrón Outbox para sincronización confiable

## Requisitos

- Python 3.12+
- Node.js 18+
- SQLite (incluido en `app/`) o PostgreSQL (para `backend_lan/`)

## Sincronización de Usuarios (backend_lan)

El `backend_lan` descarga y sincroniza automáticamente los usuarios del servidor central TrakCare. Esto permite que los profesionales de salud inicien sesión con sus mismas credenciales del sistema central sin gestión manual de cuentas.

### Flujo de sincronización

1. Al arrancar y cada `DOWNSTREAM_SYNC_INTERVAL` segundos, `sync_users_from_central()` consulta el endpoint de usuarios del API central.
2. Por cada usuario recibido, se calcula un hash de cambio (`central_sync_hash`). Si no cambió, se omite el usuario (sin escritura a BD).
3. Si hay diferencia, se actualiza (o crea) el usuario local con nombre, estado activo y contraseña hasheada.

### Formato del hash almacenado

El campo `hashed_password` en la tabla `users` puede tener dos formatos:

| Formato | Descripcion | Ejemplo |
|---|---|---|
| `$2b$...` (bcrypt) | Usuarios creados localmente por un admin | `$2b$12$...` |
| `pbkdf2central:...` | Usuarios importados desde el central | ver abajo |

**Formato `pbkdf2central`:**

```
pbkdf2central:{salt_base64}:{hash_base64}
```

- `{salt_base64}`: El salt PBKDF2 tal como lo envía el central (campo `passwordSalt`), ya en base64.
- `{hash_base64}`: El output PBKDF2 tal como lo envía el central (campo `password`), ya en base64. Si el central lo envía como bytes binarios (latin-1 con NUL), se convierte a base64 antes de almacenar.

### Como se obtiene el hash — `backend_lan/app/sync_service.py`

```python
# En process_users() — backend_lan/app/sync_service.py

raw_password_hash = item.get("password") or ""   # output PBKDF2 del central
salt_b64 = item.get("passwordSalt") or ""         # salt en base64

# Si el campo viene como bytes binarios (NUL o non-ASCII), se convierte a base64
if "\x00" in raw_password_hash or not raw_password_hash.isascii():
    raw_password_hash = base64.b64encode(
        raw_password_hash.encode("latin-1")
    ).decode("ascii")

stored_password = make_central_password_hash(raw_password_hash, salt_b64)
# → "pbkdf2central:{salt_b64}:{raw_password_hash}"
```

### Como se construye el string almacenado — `backend_lan/app/auth_utils.py`

```python
# make_central_password_hash() — backend_lan/app/auth_utils.py

PBKDF2_PREFIX = "pbkdf2central:"

def make_central_password_hash(raw_password_b64: str, salt_b64: str) -> str:
    return f"{PBKDF2_PREFIX}{salt_b64}:{raw_password_b64}"
```

### Como se verifica el password al hacer login — `backend_lan/app/auth_utils.py`

El algoritmo reproduce exactamente el calculo de InterSystems TrakCare:

```python
# _verify_pbkdf2_central() — backend_lan/app/auth_utils.py
# Equivalente al snippet de TrakCare ObjectScript:
#   set output = ##class(%SYSTEM.Encryption).PBKDF2(password, 2500, decodedSalt, 32)
#   set base64Test = $SYSTEM.Encryption.Base64Encode(output)
#   if (base64PASS = base64Test) { write "Login OK" }

PBKDF2_ITERATIONS = 2500

def _verify_pbkdf2_central(plain_password: str, stored: str) -> bool:
    payload = stored[len(PBKDF2_PREFIX):]
    salt_b64, hash_b64 = payload.split(":", 1)
    salt = base64.b64decode(salt_b64) if salt_b64 else b""
    expected = base64.b64decode(hash_b64)
    derived = hashlib.pbkdf2_hmac(
        "sha1",
        plain_password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
        dklen=32,
    )
    return hmac.compare_digest(derived, expected)
```

El dispatcher `verify_password()` elige automaticamente el metodo segun el prefijo del hash almacenado:

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith(PBKDF2_PREFIX):
        return _verify_pbkdf2_central(plain_password, hashed_password)
    return pwd_context.verify(plain_password, hashed_password)  # bcrypt
```

> Los mismos archivos existen en `app/auth_utils.py` y `app/sync_service.py` para el backend SQLite, con logica identica.

---

## Instalación

### Para Usuarios Finales (Producción)

Si desea instalar TrakCare Offline como aplicación de escritorio en Windows, consulte la **[Guía de Instalación Completa](INSTALLATION_GUIDE.md)** que incluye:

- Instalación del backend como servicio de Windows
- Instalación del frontend como aplicación Electron
- Configuración completa del sistema
- Solución de problemas

### Para Desarrolladores (Desarrollo)

#### Backend

##### Windows

```bash
setup-backend.bat
```

##### Linux/Mac

```bash
chmod +x setup-backend.sh
./setup-backend.sh
```

El script automáticamente:
1. Crea entorno virtual Python
2. Instala todas las dependencias Python
3. Crea archivo `.env` desde `.env.example`
4. Crea la base de datos con migraciones Alembic
5. Crea usuarios demo (admin/admin123, demo/demo123)

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
```

**Si encuentras errores de dependencias corruptas:**

```bash
cd frontend
fix-dependencies.bat   # Windows
# o ejecuta manualmente: rmdir /s /q node_modules && npm install --legacy-peer-deps
```

## Uso

### Opción A: Aplicación Electron (Escritorio)

Si deseas usar la aplicación de escritorio:

#### 1. Compilar la aplicación Electron

```bash
cd frontend
build-electron.bat  # Windows
# o ./build-electron.sh en Linux/Mac
```

#### 2. Iniciar TrakCare Offline (Electron + Backend)

**Opción fácil - Script automático:**
```bash
cd frontend
iniciar-trakcare-electron.bat
```

Este script automáticamente:
- Verifica si el backend está corriendo
- Inicia el backend si es necesario
- Lanza la aplicación Electron

**⚠️ IMPORTANTE**: La aplicación Electron **REQUIERE** que el backend esté corriendo. Si ves pantalla negra, es porque el backend no está iniciado.

**Documentación Electron:**
- `frontend/INICIO_RAPIDO_ELECTRON.md` - Guía de inicio rápido
- `frontend/README_ELECTRON.md` - Documentación completa
- `frontend/ELECTRON_TROUBLESHOOTING.md` - Resolución de problemas (pantalla negra, dependencias, build)

### Opción B: Desarrollo Web (Navegador)

#### 1. Iniciar Backend

```bash
# Activar entorno virtual
venv\Scripts\activate    # Windows
source venv/bin/activate # Linux/Mac

# Iniciar servidor
uvicorn app.main:app --reload --reload-exclude "frontend/*" --host 0.0.0.0 --port 8000
```

#### 2. Iniciar Frontend (en otra terminal)

```bash
cd frontend
npm run dev
```

#### 3. Acceder a la aplicación

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

**Credenciales demo:**
- Admin: `admin` / `admin123`
- Usuario: `demo` / `demo123`

### 4. Cargar datos de prueba (opcional)

Para cargar 10 pacientes de prueba con episodios completos (alergias, laboratorios, imágenes, etc.):

#### Windows
```bash
load_test_data.bat
```

#### Linux/Mac
```bash
chmod +x load_test_data.sh
./load_test_data.sh
```

Este script cargará:
- 10 pacientes con RUT válido
- 3-5 episodios anteriores por paciente
- Alergias registradas
- Resultados de laboratorio
- Resultados de imágenes (Rx, TAC, Eco, RM)
- Diagnósticos previos
- Medicamentos habituales
- Cirugías previas
- Notas clínicas de registro offline

Si necesitas aplicar migraciones a una base de datos existente:

```bash
python3 apply_migrations.py
```

## Estructura del Proyecto

```
project/
├── app/                    # Backend local (SQLite + Basic Auth)
│   ├── models.py          # Modelos SQLAlchemy
│   ├── schemas.py         # Schemas Pydantic
│   ├── main.py            # Aplicación principal
│   ├── background_tasks.py # Tareas de sincronización
│   ├── outbox_processor.py # Procesador de eventos outbox → HL7
│   ├── sync_service.py    # Health checker y sync downstream
│   ├── hl7_builder.py     # Generador de mensajes HL7
│   ├── config/            # Configuración i18n
│   └── routers/           # Endpoints REST
├── backend_lan/            # Backend LAN (PostgreSQL + JWT)
│   ├── app/               # Misma estructura que app/
│   ├── alembic/           # Migraciones PostgreSQL
│   └── README.md          # Documentación específica backend_lan
├── frontend/              # Frontend React + TypeScript
│   └── src/
│       ├── pages/         # Páginas principales
│       ├── components/    # Componentes reutilizables
│       ├── contexts/      # Contextos (Theme, User, Language)
│       ├── config/        # Configuración i18n
│       └── lib/           # Utilidades (API, Auth)
├── alembic/               # Migraciones SQLite (app/)
└── central_mock/          # Mock del servidor central
```

## Modelo de Datos

### Tabla `predefined_texts`

Plantillas de notas clínicas por usuario:

- `id`: ID autoincremental
- `user_id`: FK a users (propietario)
- `title`: Título corto descriptivo
- `content`: Texto completo de la plantilla
- `active`: Si está activa y visible en el selector
- `created_at`, `updated_at`: Marcas de tiempo

### Tabla `episodes`

Almacena episodios completos con JSON:

- `id`: ID autoincremental
- `mrn`: Medical Record Number (indexado)
- `num_episodio`: Número de episodio (único, indexado)
- `run`, `paciente`, `fecha_nacimiento`, `sexo`: Datos del paciente
- `tipo`, `fecha_atencion`, `hospital`, `habitacion`, `cama`, `ubicacion`, `estado`: Datos del episodio
- `profesional`: Profesional responsable
- `motivo_consulta`: Motivo de la consulta (enviado en HL7 PV2.3)
- `synced_flag`: Indica si está sincronizado
- **`data_json`**: JSON completo incluyendo antecedentes

### Tabla `users`

Usuarios del sistema:

- `id`: ID autoincremental
- `username`: Nombre de usuario (único)
- `hashed_password`: Contraseña hasheada
- `role`: Rol del usuario (`user`)
- `active`: Estado activo/inactivo
- `is_admin`: Indica si el usuario es administrador del sistema
- `nombre`: Nombre completo del usuario
- `filtros`: Filtros API personalizados (parámetros query para `obtenerDatos`)
- `last_login`: Fecha de último inicio de sesión
- `updated_at`: Fecha de última actualización

### Tabla `clinical_notes`

Notas clínicas asociadas a episodios:

- `id`: ID autoincremental
- `episode_id`: FK a episodes
- `author_user_id`: FK a users
- `author_nombre`: Nombre del autor (snapshot al momento de crear la nota)
- `note_text`: Texto de la nota
- `synced_flag`: Indica si está sincronizada

### Tabla `outbox_events`

Eventos para sincronización upstream:

- `id`: ID autoincremental
- `event_type`: Tipo de evento (episode_created, episode_updated, clinical_note_created)
- `correlation_id`: ID del objeto relacionado
- `hl7_payload`: Mensaje HL7 generado
- `status`: Estado (pending, sent, failed)
- `priority`: Prioridad de procesamiento
- `retry_count`: Número de reintentos
- `author_user_id`: FK al usuario que creó el evento (usado por el outbox processor para poblar el campo profesional en HL7 OBR.24)

## API Endpoints

### Episodios
- `GET /episodes` - Lista episodios (filtrable por tipo)
- `GET /episodes/{id}` - Obtiene episodio con JSON completo
- `POST /episodes` - Crea nuevo episodio
- `PUT /episodes/{id}` - Actualiza episodio

### Notas Clínicas
- `POST /episodes/{id}/notes` - Crea nota clínica
- `GET /episodes/{id}/notes` - Lista notas del episodio
- `PUT /episodes/{id}/notes/{note_id}` - Edita nota (solo autor, solo si no está sincronizada)
- `DELETE /episodes/{id}/notes/{note_id}` - Elimina nota (solo autor, solo si no está sincronizada)

### Textos Predefinidos
- `GET /predefined-texts` - Lista plantillas del usuario actual
- `POST /predefined-texts` - Crea nueva plantilla
- `PUT /predefined-texts/{id}` - Actualiza plantilla
- `DELETE /predefined-texts/{id}` - Elimina plantilla

### Sincronización
- `GET /sync/status` - Estado detallado de sincronización
- `GET /sync/stats` - Estadísticas de sincronización
- `POST /sync/trigger` - Fuerza sincronización manual

### Autenticación
- `GET /auth/me` - Usuario actual (Basic Auth)
- `PUT /auth/me` - Actualiza usuario actual
- `GET /auth/users` - Lista usuarios del sistema (solo admin)
- `POST /auth/users` - Crea nuevo usuario (solo admin)

### Configuración del Sistema
- `GET /settings` - Obtiene configuración global del sistema
- `PUT /settings` - Actualiza configuración global (solo admin)

**Parámetros de configuración:**
- `enable_read_only_mode` (bool): Cuando está activo, todos los usuarios entran en modo solo lectura al detectarse conexión con el servidor central
- `enable_new_episode_button` (bool): Controla la visibilidad del botón "Nuevo Episodio" para todos los usuarios. Por defecto `false`.

## Sincronización

El sistema sincroniza automáticamente cada 10-60 segundos:

### 1. Downstream (Central → Local)
- Intervalo: 60 segundos
- GET desde `/apirest/externos/obtenerDatos`
- Upsert de episodios completos con JSON
- Marca episodios como sincronizados

### 2. Upstream (Local → Central)
- Intervalo: 10 segundos
- Procesa eventos de tabla `outbox_events`
- Genera y envía mensajes HL7:
  - ADT^A28 (Añadir información del paciente)
  - ADT^A01 (Admitir/Visitar paciente)
  - ORU^R01 (Observaciones/Notas clínicas)
- POST a `/apirest/externos/hl7inbound`
- Reintentos automáticos (máx 5)

### 3. Actualización Automática de IDs (v2.2.0)
- Cuando se envía un mensaje ORU^R01 (nota clínica), el servidor central responde con:
  - `{"estado":"200","pid":"<ID_Paciente_TC>","enctid":"<ID_Episodio_TC>"}`
- El sistema actualiza automáticamente:
  - `episodes.mrn` ← `pid` (ID del paciente en TrakCare)
  - `episodes.num_episodio` ← `enctid` (ID del episodio en TrakCare)
- Esto garantiza que los IDs locales coincidan con los IDs del sistema central
- Los episodios y notas clínicas quedan correctamente vinculados con TrakCare

### Configuración de intervalos

En `app/settings.py`:

```python
HEALTH_CHECK_INTERVAL: int = 8  # Verificación de conectividad
DOWNSTREAM_SYNC_INTERVAL: int = 60  # Descarga de datos
UPSTREAM_SYNC_INTERVAL: int = 10  # Envío de mensajes HL7
MAX_RETRIES: int = 5  # Reintentos máximos
```

## Desarrollo

### Migraciones de Base de Datos

El proyecto usa Alembic para migraciones:

```bash
# Crear nueva migración
alembic revision -m "descripcion"

# Aplicar migraciones
alembic upgrade head

# Ver historial
alembic history
```

**Migraciones `app/` (SQLite):**
1. `001_initial_simplified.py` - Estructura inicial de base de datos
2. `002_add_profesional_field.py` - Añade campo profesional a episodios
3. `003_make_hl7_payload_nullable.py` - hl7_payload nullable en outbox
4. `004_add_user_filtros_field.py` - Añade filtros personalizados por usuario
5. `005_add_motivo_consulta_and_nombre.py` - Añade motivo_consulta, nombre de usuario y author_nombre
6. `006_add_enable_read_only_mode.py` - Agrega campo enable_read_only_mode a users (luego migrado)
7. `007_move_read_only_to_global_setting.py` - Mueve modo solo lectura a tabla sync_state como configuración global
8. `008_add_is_admin_field.py` - Agrega campo is_admin a tabla users
9. `009_add_last_login_field.py` - Agrega campo last_login a tabla users
10. `010_make_run_optional.py` - Documenta opcionalidad del campo RUN
11. `011_add_author_user_id_to_outbox_events.py` - Agrega author_user_id (FK a users) en outbox_events para identificar al profesional en mensajes HL7
12. `012_add_central_sync_hash_to_users.py` - Agrega central_sync_hash a users para detección eficiente de cambios en sync de usuarios
13. `013_add_system_config_table.py` - Tabla system_config para parámetros de configuración runtime
14. `014_add_predefined_texts_table.py` - Tabla predefined_texts para plantillas de notas clínicas por usuario

**Migraciones `backend_lan/` (PostgreSQL):**
1. `000_base.py` - Revisión base vacía
2. `001_initial_postgres_schema.py` - Schema completo con timestamps timezone-aware
3. `002_fix_data_json_to_text.py` - Corrección tipo columna data_json
4. `003_add_central_sync_hash_to_users.py` - Agrega central_sync_hash a users
5. `004_add_system_config_table.py` - Tabla system_config para parámetros de configuración runtime
6. `005_add_predefined_texts_table.py` - Tabla predefined_texts para plantillas de notas clínicas por usuario

### Variables de Entorno

Crea un archivo `.env` (opcional):

```bash
CENTRAL_URL=http://servidor-central.ejemplo.com:52773
CENTRAL_API_USERNAME=demo
CENTRAL_API_PASSWORD=demodemo
DOWNSTREAM_SYNC_INTERVAL=60
UPSTREAM_SYNC_INTERVAL=10
```

## Solución de Problemas

### Error de login en el frontend

Si obtienes "credenciales incorrectas" al intentar iniciar sesión:

1. Verifica que ejecutaste el setup del backend correctamente:
```bash
setup-backend.bat  # Windows
./setup-backend.sh # Linux/Mac
```

2. Verifica que los usuarios se crearon correctamente:
```bash
# Debe mostrar "✓ Usuarios demo listos"
```

3. Si el problema persiste, elimina la base de datos y vuelve a ejecutar setup:
```bash
rm local.db
setup-backend.bat  # Windows
./setup-backend.sh # Linux/Mac
```

### Logs de sincronización

Para ver los logs detallados de sincronización (JSON de eventos):

1. Inicia el backend en modo verbose
2. Los logs JSON aparecen cada vez que hay eventos pendientes
3. Busca en la consola las líneas que contienen "SENDING HL7 MESSAGE" y "Complete JSON Payload"

### La sincronización no funciona

1. Verifica conectividad con el servidor central:
```bash
curl -u demo:demodemo http://servidor-central/apirest/externos/obtenerDatos
```

2. Revisa logs del backend en la consola donde corre uvicorn

3. Verifica eventos pendientes en API docs: `GET /sync/stats`

### Episodios no se envían

Los episodios y notas se envían automáticamente mediante el sistema de outbox:

1. Al crear un episodio, se genera un evento `episode_created`
2. Al crear una nota, se genera un evento `clinical_note_created`
3. El procesador de outbox (cada 10s) envía estos eventos al servidor central
4. Puedes forzar el procesamiento con `POST /sync/trigger`

### Error de autenticación

Asegúrate de que las credenciales en `.env` o `settings.py` coincidan con el servidor central.

### Base de datos corrupta

Elimina `local.db` y reinicia el servidor (se recreará automáticamente).

## Servidor Mock

El proyecto incluye un servidor mock del servidor central en `central_mock/`:

```bash
cd central_mock
pip install -r requirements.txt
uvicorn app.main:app --port 52773
```

Este servidor simula:
- Endpoint `obtenerDatos` para descarga de episodios
- Endpoint `hl7inbound` para recepción de mensajes HL7
- Almacenamiento de mensajes recibidos

## Documentación Completa de Funcionalidades

Ver archivo [FUNCIONALIDADES.md](./FUNCIONALIDADES.md) para un listado exhaustivo de todas las funcionalidades del backend y frontend, incluyendo endpoints, páginas, componentes, hooks y servicios.

## Licencia

Uso interno - Todos los derechos reservados
