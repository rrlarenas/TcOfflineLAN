# DOCUMENTACIÓN COMPLETA DE FUNCIONALIDADES

Sistema TrakCare Offline - Versión 2.1.0-rc3

---

## ARQUITECTURA DEL SISTEMA

El sistema cuenta con dos variantes de backend según el modo de despliegue:

| Componente | Descripción | BD | Auth |
|---|---|---|---|
| `app/` | Backend local por estación | SQLite | Basic Auth |
| `backend_lan/` | Backend LAN multi-usuario | PostgreSQL | JWT Bearer |
| `frontend/` | Interfaz React + TypeScript | — | Ambos modos |
| `central_mock/` | Mock del servidor central | SQLite | Basic Auth |

Ambos backends exponen la misma API REST y tienen las mismas funcionalidades. Las diferencias son exclusivamente de infraestructura (base de datos y método de autenticación).

---

## ÍNDICE

1. [Backend - Autenticación y Usuarios](#backend---autenticación-y-usuarios)
2. [Backend - Episodios Clínicos](#backend---episodios-clínicos)
3. [Backend - Notas Clínicas](#backend---notas-clínicas)
4. [Backend - Salud y Estado del Sistema](#backend---salud-y-estado-del-sistema)
5. [Backend - Sincronización](#backend---sincronización)
6. [Backend - Tareas en Segundo Plano](#backend---tareas-en-segundo-plano)
7. [Backend - Servicios Auxiliares](#backend---servicios-auxiliares)
8. [Backend LAN - Diferencias y características específicas](#backend-lan---diferencias-y-características-específicas)
9. [Frontend - Páginas Principales](#frontend---páginas-principales)
10. [Frontend - Componentes](#frontend---componentes)
11. [Frontend - Contextos Globales](#frontend---contextos-globales)
12. [Frontend - Hooks Personalizados](#frontend---hooks-personalizados)
13. [Frontend - Servicios y Utilidades](#frontend---servicios-y-utilidades)
14. [Frontend - Configuración](#frontend---configuración)
15. [Características Transversales](#características-transversales)

---

## BACKEND - AUTENTICACIÓN Y USUARIOS

### Obtener usuario actual
- **Endpoint:** `GET /auth/me`
- **Archivo:** `app/routers/auth.py`
- **Autenticación:** Basic Auth
- **Descripción:** Obtiene la información del usuario autenticado actualmente
- **Response:** Datos del usuario (id, username, role, is_admin, nombre, filtros, last_login)

### Actualizar usuario actual
- **Endpoint:** `PUT /auth/me`
- **Archivo:** `app/routers/auth.py`
- **Autenticación:** Basic Auth
- **Descripción:** Permite al usuario actualizar su información (password, nombre, filtros)
- **Body:** UserUpdate (password, nombre, filtros)
- **Response:** Usuario actualizado

### Listar usuarios del sistema
- **Endpoint:** `GET /auth/users`
- **Archivo:** `app/routers/auth.py`
- **Autenticación:** Basic Auth (solo administradores)
- **Descripción:** Retorna la lista de todos los usuarios del sistema
- **Response:** Lista de usuarios ordenada por username

### Crear usuario
- **Endpoint:** `POST /auth/users`
- **Archivo:** `app/routers/auth.py`
- **Autenticación:** Basic Auth (solo administradores)
- **Descripción:** Crea un nuevo usuario en el sistema
- **Body:** UserCreateByAdmin (username, password, nombre, is_admin)
- **Response:** Usuario creado

---

## BACKEND - EPISODIOS CLÍNICOS

### Crear episodio
- **Endpoint:** `POST /episodes`
- **Archivo:** `app/routers/episodes.py:12`
- **Autenticación:** Basic Auth
- **Descripción:** Crea un nuevo episodio clínico
- **Features:**
  - Generación automática de `num_episodio` con formato `YYYYMMDD-HHMMSS`
  - Validación de datos del paciente
  - Almacenamiento del JSON completo en `data_json`
  - Creación automática de evento outbox para sincronización
  - Generación de mensaje HL7 ADT^A01 con ubicación y unidad clínica
- **Body:** EpisodeCreate (mrn, run, paciente, fecha_nacimiento, sexo, tipo, hospital, habitacion, ubicacion, etc.)
- **Response:** Episodio creado con todos los campos

### Obtener tipos únicos de episodio
- **Endpoint:** `GET /episodes/types/unique`
- **Archivo:** `app/routers/episodes.py`
- **Autenticación:** Basic Auth
- **Descripción:** Obtiene todos los tipos de episodio únicos existentes en la base de datos
- **Response:** Lista de strings con tipos de episodio (ej: ["Urgencia", "Hospitalizado", "Ambulatorio"])
- **Uso:** Poblar dropdown de tipo de episodio en formulario de creación

### Obtener ubicaciones únicas
- **Endpoint:** `GET /episodes/locations/unique?tipo={tipo_episodio}`
- **Archivo:** `app/routers/episodes.py`
- **Autenticación:** Basic Auth
- **Query Params:**
  - `tipo` (optional): Filtra ubicaciones por tipo de episodio
- **Descripción:** Obtiene todas las ubicaciones únicas existentes en la base de datos
- **Response:** Lista de strings con ubicaciones (ej: ["Urgencias", "UCI", "Pabellón"])
- **Uso:** Poblar dropdown de unidad clínica en formulario de creación

### Listar episodios
- **Endpoint:** `GET /episodes`
- **Archivo:** `app/routers/episodes.py:72`
- **Autenticación:** Basic Auth
- **Query Params:**
  - `tipo` (optional): Filtra por tipo de episodio
  - `estado` (optional): Filtra por estado (activo/cerrado)
  - `profesional` (optional): Filtra por profesional
  - `search` (optional): Búsqueda por paciente o MRN
  - `skip` (default: 0): Offset para paginación
  - `limit` (default: 50): Cantidad de resultados
- **Descripción:** Lista episodios con filtrado y paginación
- **Response:** Lista de episodios

### Obtener episodio específico
- **Endpoint:** `GET /episodes/{episode_id}`
- **Archivo:** `app/routers/episodes.py:122`
- **Autenticación:** Basic Auth
- **Descripción:** Obtiene un episodio completo incluyendo el JSON con antecedentes
- **Response:** Episodio con data_json completo

### Actualizar episodio
- **Endpoint:** `PUT /episodes/{episode_id}`
- **Archivo:** `app/routers/episodes.py:141`
- **Autenticación:** Basic Auth
- **Descripción:** Actualiza un episodio existente
- **Features:**
  - Actualización de campos indexados
  - Actualización del JSON completo
  - No genera evento outbox (solo se sincronizan creaciones)
- **Body:** EpisodeUpdate
- **Response:** Episodio actualizado

### Eliminar episodio
- **Endpoint:** `DELETE /episodes/{episode_id}`
- **Archivo:** `app/routers/episodes.py:176`
- **Autenticación:** Basic Auth
- **Descripción:** Elimina un episodio y sus notas asociadas
- **Response:** Estado de eliminación

---

## BACKEND - NOTAS CLÍNICAS

### Crear nota clínica
- **Endpoint:** `POST /episodes/{episode_id}/notes`
- **Archivo:** `app/routers/notes.py:11`
- **Autenticación:** Basic Auth
- **Descripción:** Crea una nota clínica asociada a un episodio
- **Features:**
  - Snapshot del nombre del autor al momento de creación
  - Creación automática de evento outbox
  - Generación de mensaje HL7 ORU^R01
  - Actualización automática de IDs (MRN y num_episodio) con respuesta del servidor
- **Body:** ClinicalNoteCreate (note_text)
- **Response:** Nota clínica creada

### Listar notas de episodio
- **Endpoint:** `GET /episodes/{episode_id}/notes`
- **Archivo:** `app/routers/notes.py:48`
- **Autenticación:** Basic Auth
- **Query Params:**
  - `skip` (default: 0): Offset para paginación
  - `limit` (default: 100): Cantidad de resultados
- **Descripción:** Lista todas las notas de un episodio específico
- **Response:** Lista de notas clínicas ordenadas por fecha de creación (descendente)

### Obtener nota específica
- **Endpoint:** `GET /episodes/{episode_id}/notes/{note_id}`
- **Archivo:** `app/routers/notes.py:92`
- **Autenticación:** Basic Auth
- **Descripción:** Obtiene una nota clínica específica
- **Validación:** Verifica que la nota pertenezca al episodio indicado
- **Response:** Nota clínica completa

---

## BACKEND - SALUD Y ESTADO DEL SISTEMA

### Health check local
- **Endpoint:** `GET /health`
- **Archivo:** `app/routers/general.py`
- **Autenticación:** No requerida
- **Descripción:** Verifica el estado del servidor local
- **Response:** `{"status": "ok"}`

### Health check servidor central
- **Endpoint:** `GET /health/central`
- **Archivo:** `app/routers/general.py`
- **Autenticación:** No requerida
- **Descripción:** Verifica conectividad con el servidor central
- **Response:** Estado de conexión y detalles de respuesta

### Obtener configuración del sistema
- **Endpoint:** `GET /settings`
- **Archivo:** `app/routers/general.py`
- **Autenticación:** Basic Auth
- **Descripción:** Obtiene la configuración global del sistema
- **Response:**
  - `enable_read_only_mode` (bool): Estado del modo solo lectura global
  - `enable_new_episode_button` (bool): Visibilidad del botón "Nuevo Episodio"

### Actualizar configuración del sistema
- **Endpoint:** `PUT /settings`
- **Archivo:** `app/routers/general.py`
- **Autenticación:** Basic Auth (solo administradores)
- **Descripción:** Actualiza la configuración global del sistema. Solo accesible para usuarios con `is_admin=True`
- **Body:** `SystemSettings` (enable_read_only_mode, enable_new_episode_button)
- **Almacenamiento:** Los valores se persisten en la tabla `sync_state` como pares clave/valor

### Estado de sincronización
- **Endpoint:** `GET /sync/status`
- **Archivo:** `app/routers/general.py`
- **Autenticación:** Basic Auth
- **Descripción:** Obtiene estado detallado de la sincronización
- **Response:**
  - Conectividad con servidor central
  - Cantidad de eventos pendientes
  - Cantidad de eventos fallidos
  - Fecha de última sincronización downstream
  - Estado de sincronización general

---

## BACKEND - SINCRONIZACIÓN

### Sincronizar manualmente
- **Endpoint:** `POST /sync/trigger`
- **Archivo:** `app/routers/sync.py:14`
- **Autenticación:** Basic Auth
- **Descripción:** Fuerza una sincronización manual inmediata
- **Features:**
  - Ejecuta sincronización downstream (obtener datos del central)
  - Ejecuta sincronización upstream (enviar eventos outbox)
- **Response:** Resultado de la sincronización

### Reintentar eventos fallidos
- **Endpoint:** `POST /sync/retry-failed`
- **Archivo:** `app/routers/sync.py:40`
- **Autenticación:** Basic Auth
- **Descripción:** Resetea el contador de reintentos de eventos fallidos
- **Features:**
  - Reinicia retry_count a 0
  - Cambia status de 'failed' a 'pending'
  - Permite reenvío automático de mensajes que fallaron
- **Response:** Cantidad de eventos reseteados

### Estado de conexión
- **Endpoint:** `GET /sync/connection-status`
- **Archivo:** `app/routers/sync.py:67`
- **Autenticación:** Basic Auth
- **Descripción:** Obtiene el estado actual de conexión
- **Response:**
  - Estado del servidor local
  - Estado del servidor central
  - Conectividad general

### Estadísticas de sincronización
- **Endpoint:** `GET /sync/stats`
- **Archivo:** `app/routers/sync.py:82`
- **Autenticación:** Basic Auth
- **Descripción:** Obtiene estadísticas detalladas de eventos outbox
- **Response:**
  - Eventos pendientes (por tipo)
  - Eventos enviados (por tipo)
  - Eventos fallidos (por tipo)
  - Total de eventos

### Sincronizar desde central
- **Endpoint:** `POST /sync/from-central`
- **Archivo:** `app/routers/sync.py:103`
- **Autenticación:** Basic Auth
- **Descripción:** Ejecuta solo sincronización downstream (descarga de datos)
- **Features:**
  - Obtiene datos del endpoint `/apirest/externos/obtenerDatos`
  - Upsert de episodios locales
  - Marca episodios como sincronizados
- **Response:** Resultado de la sincronización

---

## BACKEND - TAREAS EN SEGUNDO PLANO

### Monitoreo de salud del servidor central
- **Archivo:** `app/sync_service.py:66`
- **Función:** `check_central_health()`
- **Intervalo:** Cada 8 segundos (configurable en settings)
- **Descripción:** Verifica continuamente la conectividad con el servidor central
- **Actualiza:** Variable global `central_server_online`

### Procesamiento de eventos Outbox
- **Archivo:** `app/outbox_processor.py`
- **Función:** `process_outbox_events()`
- **Intervalo:** Cada 10 segundos (configurable en settings)
- **Descripción:** Procesa eventos pendientes en la tabla outbox_events
- **Features:**
  - Envía mensajes HL7 al servidor central
  - Actualiza status de eventos (pending → sent/failed)
  - Incrementa retry_count en caso de falla
  - Máximo 5 reintentos
  - Actualiza IDs (MRN y num_episodio) con respuesta del servidor

### Sincronización automática al iniciar
- **Archivo:** `app/main.py:73`
- **Función:** `startup_sync_from_central()`
- **Trigger:** Al iniciar el servidor
- **Descripción:** Ejecuta una sincronización downstream inmediata al arrancar
- **Features:**
  - Descarga episodios del servidor central
  - Actualiza base de datos local
  - Solo se ejecuta si el servidor central está disponible

### Reset de contadores de reintentos
- **Archivo:** `app/main.py:52`
- **Función:** `reset_retry_counts_on_startup()`
- **Trigger:** Al iniciar el servidor
- **Descripción:** Resetea contadores de reintentos de eventos fallidos
- **Features:**
  - Cambia status de 'failed' a 'pending'
  - Reinicia retry_count a 0
  - Permite reenvío automático al arrancar

---

## BACKEND - SERVICIOS AUXILIARES

### Construcción de mensajes HL7
- **Archivo:** `app/hl7_builder.py`
- **Funciones principales:**
  - `build_a28_message()`: Mensaje ADT^A28 (Añadir información del paciente)
  - `build_a01_message()`: Mensaje ADT^A01 (Admitir/Visitar paciente)
  - `build_oru_message()`: Mensaje ORU^R01 (Observaciones/Notas clínicas)
- **Features:**
  - Generación de segmentos MSH, EVN, PID, PV1, PV2, OBR, OBX
  - Formateo correcto de fechas
  - Codificación de caracteres especiales
  - Validación de campos requeridos
  - **PV1.3** incluye unidad clínica y habitación en formato: `ubicacion^habitacion`
  - Separación clara entre ubicación física (habitacion) y servicio (ubicacion)

### Gestión de estado de sincronización
- **Archivo:** `app/sync_service.py:83`
- **Función:** `get_sync_state()`
- **Descripción:** Obtiene el estado completo de sincronización del sistema
- **Response:**
  - Estado de servidores (local y central)
  - Contadores de eventos outbox
  - Fecha de última sincronización
  - Conectividad general

### Obtención de datos desde central
- **Archivo:** `app/sync_service.py`
- **Función:** `sync_from_central()`
- **Descripción:** Descarga episodios del servidor central
- **Features:**
  - GET a `/apirest/externos/obtenerDatos`
  - Autenticación Basic Auth
  - Parseo de respuesta JSON
  - Upsert de episodios locales
  - Actualización de marca `synced_flag`

### Procesamiento de datos de pacientes
- **Archivo:** `app/sync_service.py`
- **Función:** `process_patient_data()`
- **Descripción:** Procesa y almacena datos de pacientes descargados
- **Features:**
  - Creación o actualización de episodios
  - Preservación de JSON completo
  - Actualización de campos indexados
  - Marca como sincronizado

### Sincronización de usuarios desde central (backend_lan)
- **Archivos:** `backend_lan/app/sync_service.py`, `backend_lan/app/auth_utils.py`
- **Clase:** `CentralUserSync`
- **Función pública:** `sync_users_from_central()`
- **Descripción:** Importa usuarios del servidor central TrakCare al sistema local. Permite login con credenciales del central sin gestión manual.
- **Features:**
  - Detección eficiente de cambios mediante `central_sync_hash` (SHA-256): solo escribe a BD si el usuario cambió
  - Sanitización de campo `password`: si viene con bytes binarios/NUL, se convierte a base64 antes de almacenar
  - Hash almacenado en formato `pbkdf2central:{salt_b64}:{hash_b64}`
  - Verificación PBKDF2-SHA1 / 2500 iteraciones / 32 bytes, compatible con InterSystems TrakCare
  - Usuarios locales (bcrypt) y usuarios del central (pbkdf2central) coexisten en la misma tabla
  - El campo `filtros` se inicializa con el username para el primer sync

---

## BACKEND LAN - DIFERENCIAS Y CARACTERÍSTICAS ESPECÍFICAS

### Autenticación JWT

- **Archivo:** `backend_lan/app/auth_utils.py`
- **Endpoint de login:** `POST /auth/token`
- **Body:** `username` y `password` como form fields (OAuth2 Password Flow)
- **Respuesta:** `{"access_token": "...", "token_type": "bearer"}`
- **Expiración:** 480 minutos (configurable con `ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Seguridad:** El `user_id` del payload JWT se revalida en cada request contra la base de datos. No se confía ciegamente en el token.

### PostgreSQL con pool de conexiones

- **Archivo:** `backend_lan/app/db.py`
- **Motor:** SQLAlchemy con `pool_pre_ping=True`, `pool_size=10`, `max_overflow=20`
- **Soporte:** Múltiples conexiones concurrentes
- **Timestamps:** Todos los campos DateTime son timezone-aware

### Sincronización de usuarios desde el servidor central

- **Archivos:**
  - `backend_lan/app/sync_service.py` — clase `CentralUserSync`, función `sync_users_from_central()`
  - `backend_lan/app/auth_utils.py` — funciones de hash y verificación PBKDF2
- **Trigger:** Al arrancar el servidor y en cada ciclo de background tasks
- **Descripción:** Los usuarios del sistema TrakCare central se importan automáticamente. Los profesionales pueden iniciar sesión con sus mismas credenciales del sistema central sin gestión manual de cuentas.

#### Flujo de sincronización de usuarios

1. `CentralUserSync.fetch_users()` hace GET al endpoint de usuarios del API central con autenticación Basic Auth.
2. Por cada usuario recibido, se calcula un `central_sync_hash` (SHA-256 de username + nombre + password_hash). Si coincide con el almacenado, el usuario se omite sin escritura a BD.
3. Si hay diferencia, el usuario se actualiza (nombre, activo, contraseña) o se crea si no existe.
4. El campo `filtros` del usuario se inicializa automáticamente con el username como filtro de API.

#### Algoritmo de password — InterSystems TrakCare PBKDF2

El servidor central usa `PBKDF2-SHA1` con 2500 iteraciones y clave de 32 bytes. El campo `password` en la respuesta del API contiene el output PBKDF2 (en base64 o como bytes binarios según el usuario), y `passwordSalt` contiene el salt en base64.

**Formato almacenado en `hashed_password`:**

```
pbkdf2central:{salt_base64}:{hash_base64}
```

**Construccion del hash — `backend_lan/app/auth_utils.py` (linea 54)**

```python
PBKDF2_PREFIX = "pbkdf2central:"

def make_central_password_hash(raw_password_b64: str, salt_b64: str) -> str:
    return f"{PBKDF2_PREFIX}{salt_b64}:{raw_password_b64}"
```

**Sanitizacion en sync — `backend_lan/app/sync_service.py` (linea 316)**

```python
raw_password_hash = item.get("password") or ""
salt_b64 = item.get("passwordSalt") or ""

# Algunos usuarios del central envian el campo como bytes binarios (con NUL).
# Se detecta y se convierte a base64 para almacenamiento seguro en PostgreSQL.
if "\x00" in raw_password_hash or not raw_password_hash.isascii():
    raw_password_hash = base64.b64encode(
        raw_password_hash.encode("latin-1")
    ).decode("ascii")

stored_password = make_central_password_hash(raw_password_hash, salt_b64)
```

**Verificacion al hacer login — `backend_lan/app/auth_utils.py` (linea 25)**

Reproduce exactamente el calculo de InterSystems ObjectScript:
```objectscript
set output = ##class(%SYSTEM.Encryption).PBKDF2(password, 2500, decodedSalt, 32)
set base64Test = $SYSTEM.Encryption.Base64Encode(output)
if (base64PASS = base64Test) { write "Login OK" }
```

```python
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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith(PBKDF2_PREFIX):
        return _verify_pbkdf2_central(plain_password, hashed_password)
    return pwd_context.verify(plain_password, hashed_password)  # bcrypt para usuarios locales
```

> La misma logica existe en `app/auth_utils.py` y `app/sync_service.py` para el backend SQLite.

### Session-safety en OutboxEvent

- **Archivo:** `backend_lan/app/models.py` — clase `OutboxEvent`
- **Campo:** `author_user_id` (FK a `users.id`, nullable)
- **Descripción:** Cada evento de sincronización registra el ID del usuario que lo creó. El procesador de outbox usa este campo para poblar el campo profesional (`user`) en el HL7 OBR.24. Esto garantiza que el mensaje enviado al servidor central identifica correctamente al profesional que realizó la acción, independientemente del orden de procesamiento del outbox.
- **Asignado en:**
  - `POST /episodes` → evento `episode_created`
  - `PUT /episodes/{id}` → evento `episode_updated`
  - `POST /episodes/{id}/notes` → evento `clinical_note_created`

### Health check sin ruido en logs

- **Archivo:** `backend_lan/app/sync_service.py` — método `check_health()`
- **Comportamiento:** El health check hace `HEAD` a `CENTRAL_URL` cada `HEALTH_CHECK_INTERVAL` segundos. Si el servidor responde con cualquier código `< 500` (incluido 404), la conexión se considera activa. El logger de httpx se silencia durante esta operación para evitar entradas `INFO: HTTP/1.1 404` en el log cuando la raíz del servidor central no tiene handler.

### Migraciones especificas

- **Directorio:** `backend_lan/alembic/versions/`
- `000_base.py` — Revisión base vacía
- `001_initial_postgres_schema.py` — Schema completo con PostgreSQL y timestamps timezone-aware
- `002_fix_data_json_to_text.py` — Corrección de tipo de columna `data_json`
- `003_add_central_sync_hash_to_users.py` — Agrega `central_sync_hash` para detección eficiente de cambios en sync

---

## FRONTEND - PÁGINAS PRINCIPALES

### Página de login
- **Ruta:** `/login`
- **Archivo:** `frontend/src/pages/Login.tsx`
- **Descripción:** Página de autenticación de usuarios
- **Funcionalidades:**
  - Formulario de login (username/password)
  - Validación de credenciales
  - Autenticación Basic Auth
  - Almacenamiento de token en localStorage
  - Redirección a página de episodios post-login
  - Manejo de errores de autenticación
  - Modo claro/oscuro
  - Soporte multiidioma

### Página de episodios (lista)
- **Ruta:** `/`
- **Archivo:** `frontend/src/pages/Episodes.tsx`
- **Descripción:** Página principal con listado de episodios
- **Funcionalidades:**
  - Listado de episodios en tabla con pestañas por tipo
  - Indicadores de estado de conexión y última sincronización
  - Navegación a nota clínica al hacer clic en un episodio
  - Actualización automática cada 15 segundos
  - Estadísticas de sincronización en tiempo real (GET/HL7, eventos pendientes)
  - Banner de modo solo lectura cuando está activo
  - **Botón "Nuevo Episodio"**: visible solo cuando `enable_new_episode_button=true` en la configuración del sistema (controlado por administradores)

### Página de nuevo episodio
- **Ruta:** `/episodes/new`
- **Archivo:** `frontend/src/pages/NewEpisode.tsx`
- **Descripción:** Formulario de creación de nuevo episodio
- **Funcionalidades:**
  - Datos del paciente
    - Nombre y apellidos
    - RUT (opcional, con validación)
    - Sexo
    - Fecha de nacimiento
  - Datos del episodio
    - **Tipo de episodio**: Dropdown dinámico que carga tipos desde la BD
    - **Unidad Clínica**: Combobox con búsqueda que filtra por tipo seleccionado
    - Habitación/Box (opcional)
    - Motivo de consulta (opcional)
  - Validación de campos requeridos
  - Carga dinámica de datos desde la base de datos
  - Navegación automática a nota creada
  - Cancelación y retorno a lista
- **Características especiales:**
  - Los dropdowns se poblan dinámicamente desde episodios sincronizados
  - La unidad clínica se filtra según el tipo de episodio seleccionado
  - Búsqueda en tiempo real en el combobox de unidad clínica
  - Los dropdowns se deshabilitan si no hay datos disponibles

### Página de nota clínica
- **Ruta:** `/episodes/:episodeId/notes/:noteId`
- **Archivo:** `frontend/src/pages/ClinicalNote.tsx`
- **Descripción:** Vista y edición de nota clínica con formato SOAP
- **Funcionalidades:**
  - Visualización de información del paciente
  - Información del episodio
  - Editor de nota con formato SOAP
    - Subjetivo (S)
    - Objetivo (O)
    - Análisis (A)
    - Plan (P)
  - Guardado automático (debounced)
  - Indicador de guardado
  - Sidebar con historial del paciente
  - Navegación entre episodios del paciente
  - Botón de volver a lista de episodios
  - Modo claro/oscuro
  - Soporte multiidioma

---

## FRONTEND - COMPONENTES

### Tabla de episodios
- **Archivo:** `frontend/src/components/EpisodesTable.tsx`
- **Props:**
  - `episodes`: Array de episodios
  - `onNavigateToNote`: Callback de navegación
- **Descripción:** Componente de tabla para renderizar lista de episodios
- **Funcionalidades:**
  - Renderizado de columnas:
    - Paciente (nombre + edad)
    - MRN
    - Tipo de episodio
    - Hospital
    - Ubicación
    - Profesional
    - Fecha de atención
    - Estado (activo/cerrado)
    - Sincronización
  - Indicadores visuales de estado
  - Indicadores de sincronización (✓/⏳)
  - Botón de ver nota
  - Responsive design
  - Internacionalización

### Header principal
- **Archivo:** `frontend/src/components/Header.tsx`
- **Descripción:** Cabecera de la aplicación con controles y estado
- **Funcionalidades:**
  - Logo y título de la aplicación
  - Indicador de estado de conexión
    - Estado servidor local (online/offline)
    - Estado servidor central (online/offline)
  - Botón de sincronización manual
  - Estadísticas de sincronización en tooltip
    - Eventos pendientes
    - Eventos enviados
    - Eventos fallidos
  - Botón de configuración de usuario
  - Información del usuario actual
  - Botón de cerrar sesión
  - Responsive design
  - Modo claro/oscuro
  - Soporte multiidioma

### Sidebar de historial del paciente
- **Archivo:** `frontend/src/components/PatientHistorySidebar.tsx`
- **Props:**
  - `patient`: Datos del paciente
  - `currentEpisodeId`: ID del episodio actual
  - `onClose`: Callback para cerrar
- **Descripción:** Panel lateral con historial de episodios del paciente
- **Funcionalidades:**
  - Información del paciente (nombre, RUN, MRN)
  - Fecha de nacimiento y edad
  - Información de contacto (teléfono, email)
  - Listado de episodios anteriores
  - Navegación entre episodios
  - Indicador de episodio actual
  - Botón de cerrar
  - Scroll interno
  - Modo claro/oscuro
  - Soporte multiidioma

### Modal de configuración de usuario
- **Archivo:** `frontend/src/components/UserSettingsModal.tsx`
- **Props:**
  - `isOpen`: Estado de apertura
  - `onClose`: Callback para cerrar
  - `user`: Datos del usuario actual
  - `onUserUpdated`: Callback al actualizar usuario
- **Descripción:** Modal de configuración del usuario con pestañas para administradores
- **Funcionalidades (todos los usuarios):**
  - Cambio de contraseña
  - Actualización de nombre completo
  - Configuración de filtros API personalizados
  - Guardado de preferencias en backend
  - Validación de cambios
- **Funcionalidades exclusivas de administrador:**
  - **Pestaña "Configuración"**: Sección "Configuración del Sistema" con:
    - Toggle para habilitar/deshabilitar modo solo lectura global
    - Toggle para habilitar/deshabilitar botón "Nuevo Episodio" para todos los usuarios
  - **Pestaña "Gestión de Usuarios"**: Lista de usuarios del sistema y creación de nuevos usuarios
- **Textos:** Completamente traducidos usando el sistema i18n (`t.systemSettings.*`)

### Componente de tabs
- **Archivo:** `frontend/src/components/Tabs.tsx`
- **Props:**
  - `tabs`: Array de {id, label}
  - `activeTab`: ID del tab activo
  - `onChange`: Callback de cambio
- **Descripción:** Componente reutilizable de pestañas
- **Funcionalidades:**
  - Renderizado de pestañas
  - Indicador visual de tab activo
  - Manejo de cambio de tab
  - Accesibilidad (role="tablist")
  - Modo claro/oscuro
  - Responsive design

### Ruta protegida
- **Archivo:** `frontend/src/components/ProtectedRoute.tsx`
- **Props:**
  - `children`: Componentes hijos
- **Descripción:** Componente HOC para proteger rutas
- **Funcionalidades:**
  - Verificación de autenticación
  - Redirección a /login si no autenticado
  - Permite acceso si autenticado
  - Integración con UserContext

---

## FRONTEND - CONTEXTOS GLOBALES

### Contexto de usuario
- **Archivo:** `frontend/src/contexts/UserContext.tsx`
- **Descripción:** Contexto global para gestión de estado del usuario
- **Estado gestionado:**
  - `user`: Datos del usuario actual (id, username, role, nombre, profesional, filtros)
  - `token`: Token de autenticación
  - `isAuthenticated`: Booleano de estado de autenticación
  - `loading`: Estado de carga
- **Métodos:**
  - `login(username, password)`: Autenticar usuario
  - `logout()`: Cerrar sesión
  - `updateUser(data)`: Actualizar datos del usuario
  - `refreshUser()`: Recargar datos del usuario
- **Persistencia:** localStorage para token y user

### Contexto de tema
- **Archivo:** `frontend/src/contexts/ThemeContext.tsx`
- **Descripción:** Contexto global para gestión de tema visual
- **Estado gestionado:**
  - `theme`: Tema actual ('dark' | 'light')
- **Métodos:**
  - `toggleTheme()`: Alternar entre dark y light
  - `setTheme(theme)`: Establecer tema específico
- **Persistencia:** localStorage
- **Integración:** Aplica clase al elemento html root

### Contexto de idioma
- **Archivo:** `frontend/src/contexts/LanguageContext.tsx`
- **Descripción:** Contexto global para internacionalización
- **Estado gestionado:**
  - `language`: Idioma actual ('es' | 'en')
  - `t`: Función de traducción
- **Métodos:**
  - `setLanguage(lang)`: Cambiar idioma
- **Persistencia:** localStorage
- **Features:**
  - Carga dinámica de traducciones
  - Función de traducción con fallback
  - Soporte para traducciones anidadas

---

## FRONTEND - HOOKS PERSONALIZADOS

### Hook de estado de conexión
- **Archivo:** `frontend/src/hooks/useConnectionStatus.ts`
- **Descripción:** Hook personalizado para monitorear estado de conexión
- **Returns:**
  - `localServerOnline`: Estado del servidor local (boolean)
  - `centralServerOnline`: Estado del servidor central (boolean)
  - `isLoading`: Estado de carga (boolean)
- **Funcionalidades:**
  - Polling automático cada 5 segundos
  - Verificación de /sync/connection-status
  - Actualización automática de estado
  - Manejo de errores
  - Cleanup al desmontar

---

## FRONTEND - SERVICIOS Y UTILIDADES

### Servicio API
- **Archivo:** `frontend/src/lib/api.ts`
- **Descripción:** Cliente HTTP centralizado con Axios
- **Configuración:**
  - Base URL desde variable de entorno
  - Timeout: 10 segundos
  - Headers: Content-Type application/json
- **Interceptores:**
  - Request: Añade header Authorization con token
  - Response: Manejo de errores 401 (logout automático)
- **Funciones exportadas:**
  - `fetchEpisodes(params)`: GET /episodes
  - `fetchEpisode(id)`: GET /episodes/:id
  - `createEpisode(data)`: POST /episodes
  - `updateEpisode(id, data)`: PUT /episodes/:id
  - `deleteEpisode(id)`: DELETE /episodes/:id
  - `createClinicalNote(episodeId, data)`: POST /episodes/:id/notes
  - `fetchClinicalNotes(episodeId)`: GET /episodes/:id/notes
  - `fetchClinicalNote(episodeId, noteId)`: GET /episodes/:id/notes/:noteId
  - `updateClinicalNote(episodeId, noteId, data)`: PUT /episodes/:id/notes/:noteId
  - `searchPatients(query)`: POST /sync/from-central con filtro
  - `getCurrentUser()`: GET /auth/me
  - `updateCurrentUser(data)`: PUT /auth/me
  - `getSyncStatus()`: GET /sync/status
  - `getSyncStats()`: GET /sync/stats
  - `triggerSync()`: POST /sync/trigger
  - `getConnectionStatus()`: GET /sync/connection-status

### Servicio de autenticación
- **Archivo:** `frontend/src/lib/auth.ts`
- **Descripción:** Servicio de autenticación y gestión de tokens
- **Funciones:**
  - `login(username, password)`: Autenticar y obtener token
  - `logout()`: Limpiar token y datos de localStorage
  - `getToken()`: Obtener token actual
  - `setToken(token)`: Guardar token en localStorage
  - `isAuthenticated()`: Verificar si hay token válido
- **Integración:** Basic Auth (username:password en base64)
- **Storage:** localStorage

### Utilidad de tiempo relativo
- **Archivo:** `frontend/src/lib/timeAgo.ts`
- **Descripción:** Utilidad para formateo de fechas relativas
- **Función:** `timeAgo(dateString, language)`
- **Funcionalidades:**
  - Calcula tiempo transcurrido desde una fecha
  - Formatos: segundos, minutos, horas, días, semanas, meses, años
  - Soporte multiidioma (es/en)
  - Manejo de fechas futuras
  - Formato "hace X tiempo" / "X ago"

---

## FRONTEND - CONFIGURACIÓN

### Internacionalización
- **Archivos:**
  - `frontend/src/config/i18n.ts`: Sistema de traducciones
  - `frontend/src/config/lang_es.ts`: Traducciones español
  - `frontend/src/config/lang_en.ts`: Traducciones inglés
- **Estructura de traducciones:**
  - `systemSettings`: Configuración del sistema (sección admin)
  - `readOnlyMode`: Textos del modo solo lectura
  - `common`: Textos comunes (guardar, cancelar, etc.)
  - `header`: Cabecera
  - `login`: Autenticación
  - `episodes`: Episodios y estados de sincronización
  - `clinicalNote`: Notas clínicas
  - `patientHistory`: Historial del paciente
  - `newEpisode`: Formulario de nuevo episodio
  - `timeAgo`: Formato de tiempo relativo
  - `userSettings`: Configuración de usuario
  - `episodeTypes` / `episodeStatus`: Etiquetas de tipo y estado

### Tipos TypeScript
- **Archivo:** `frontend/src/types/index.ts`
- **Interfaces definidas:**
  - `User`: Usuario del sistema (incluye `is_admin`)
  - `UserUpdateRequest`: Campos actualizables por el usuario
  - `UserCreateRequest`: Campos para creación de usuario (admin)
  - `SystemSettings`: Configuración global del sistema (`enable_read_only_mode`, `enable_new_episode_button`)
  - `Episode`: Episodio clínico
  - `EpisodeDetail`: Episodio con `data` JSON parseado
  - `ClinicalNote`: Nota clínica con autor
  - `SyncStats`: Estadísticas completas de sincronización
  - `SyncStatus`: Estado básico de sincronización

---

## CARACTERÍSTICAS TRANSVERSALES

### Modo offline
- **Descripción:** El sistema funciona completamente sin conexión al servidor central
- **Funcionalidades:**
  - Creación de episodios y notas en modo offline
  - Almacenamiento local en SQLite
  - Encola operaciones en tabla `outbox_events`
  - Sincronización automática al recuperar conexión
  - Indicadores visuales de estado de conexión
  - Reintentos automáticos de operaciones fallidas

### Sincronización bidireccional
- **Local → Central (Upstream):**
  - Envío de eventos desde `outbox_events`
  - Mensajes HL7: ADT^A28, ADT^A01, ORU^R01
  - POST a `/apirest/externos/hl7inbound`
  - Reintentos automáticos (máx 5)
  - Actualización de IDs con respuesta del servidor
- **Central → Local (Downstream):**
  - Descarga de episodios cada 60 segundos
  - GET desde `/apirest/externos/obtenerDatos`
  - Upsert de episodios locales
  - Marca de episodios como sincronizados
- **Manejo de conflictos:**
  - Los datos del servidor central prevalecen en downstream
  - Los eventos locales no sincronizados se preservan
  - No se sobrescriben datos locales más recientes

### Multiidioma
- **Idiomas soportados:**
  - Español (es)
  - Inglés (en)
- **Características:**
  - Cambio dinámico sin recargar página
  - Persistencia en localStorage
  - Traducciones en backend y frontend
  - Consistencia entre ambas capas
  - Fechas y formatos localizados

### Temas
- **Temas disponibles:**
  - Modo claro (light)
  - Modo oscuro (dark)
- **Características:**
  - Toggle visual en header
  - Persistencia en localStorage
  - Aplicación global mediante clases CSS
  - Paleta de colores coherente
  - Contraste adecuado para accesibilidad
  - Transiciones suaves entre temas

### Gestión de estado
- **Estrategias:**
  - React Context API para estado global
  - useState para estado local de componentes
  - useEffect para efectos secundarios
  - Custom hooks para lógica reutilizable
- **Persistencia:**
  - localStorage para preferencias de usuario
  - SQLite para datos de aplicación
  - Backend como fuente de verdad

### Seguridad
- **Autenticación:**
  - Basic Auth con username/password
  - Token almacenado en localStorage
  - Header Authorization en todas las peticiones
- **Autorización:**
  - Rutas protegidas en frontend
  - Verificación de usuario en backend
  - Filtrado por profesional en endpoints
- **Validación:**
  - Validación de entrada en frontend
  - Validación con Pydantic en backend
  - Sanitización de datos
  - Prevención de inyección SQL (SQLAlchemy ORM)
