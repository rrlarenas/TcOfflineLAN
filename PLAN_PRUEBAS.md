# Plan de Pruebas — TrakCare Offline v2.5.0-rc10-stable

Sistema de contingencia clínica con sincronización bidireccional al servidor central TrakCare.

---

## Tabla de Contenidos

1. [Alcance y objetivos](#1-alcance-y-objetivos)
2. [Entornos de prueba](#2-entornos-de-prueba)
3. [Casos de uso cubiertos](#3-casos-de-uso-cubiertos)
4. [Pruebas de autenticación](#4-pruebas-de-autenticación)
5. [Pruebas de sincronización de usuarios (backend_lan)](#5-pruebas-de-sincronización-de-usuarios-backend_lan)
6. [Pruebas de episodios clínicos](#6-pruebas-de-episodios-clínicos)
7. [Pruebas de notas clínicas](#7-pruebas-de-notas-clínicas)
8. [Pruebas de sincronización con el servidor central](#8-pruebas-de-sincronización-con-el-servidor-central)
9. [Pruebas de modo solo lectura](#9-pruebas-de-modo-solo-lectura)
10. [Pruebas de operación offline](#10-pruebas-de-operación-offline)
11. [Pruebas de administración del sistema](#11-pruebas-de-administración-del-sistema)
12. [Pruebas de configuración de usuario](#12-pruebas-de-configuración-de-usuario)
13. [Pruebas de interfaz y usabilidad](#13-pruebas-de-interfaz-y-usabilidad)
14. [Pruebas de seguridad](#14-pruebas-de-seguridad)
15. [Criterios de aceptación globales](#15-criterios-de-aceptación-globales)

---

## 1. Alcance y objetivos

### Objetivos

- Verificar que la aplicación funciona correctamente en modo offline y con conexión al servidor central.
- Confirmar que los mensajes HL7 generados son válidos y reconocidos por el servidor central TrakCare.
- Validar el flujo completo de un episodio clínico desde su creación hasta la confirmación del servidor central.
- Verificar la sincronización de usuarios desde el servidor central (backend_lan).
- Asegurar que el modo solo lectura protege correctamente contra registros duplicados.

### Fuera de alcance

- Pruebas de carga/stress (no aplica para contingencia clínica de baja concurrencia).
- Pruebas de integración con otros sistemas distintos a TrakCare.
- Validación de contenido clínico de las notas.

---

## 2. Entornos de prueba

### Entorno A — Backend local (app/ + SQLite)

| Componente | Valor |
|---|---|
| Backend | `http://localhost:8000` |
| Autenticación | Basic Auth (usuario:contraseña) |
| Base de datos | SQLite (`local.db`) |
| Servidor central | `central_mock/` corriendo en `http://localhost:52773` (simulado) |

Credenciales de prueba:
- Administrador: `admin` / `admin123`
- Usuario regular: `demo` / `demo123`

### Entorno B — Backend LAN (backend_lan/ + PostgreSQL)

| Componente | Valor |
|---|---|
| Backend | `http://localhost:8000` (Docker) |
| Autenticación | JWT Bearer (OAuth2 Password Flow) |
| Base de datos | PostgreSQL |
| Servidor central | URL configurada en `.env` de `backend_lan/` |

Credenciales de prueba:
- Las mismas del servidor central TrakCare (sincronizadas automáticamente).
- Usuario local de respaldo: `admin` / `admin123`.

### Requisito previo para todas las pruebas

- El backend está corriendo y responde en `/health`.
- La base de datos tiene las migraciones aplicadas.
- El `central_mock` o servidor central real está disponible para pruebas de sincronización.

---

## 3. Casos de uso cubiertos

| ID | Caso de uso | Sección de pruebas |
|---|---|---|
| CU-01 | Login con credenciales locales | [4. Autenticación](#4-pruebas-de-autenticación) |
| CU-02 | Login con credenciales del servidor central TrakCare | [5. Sync de usuarios](#5-pruebas-de-sincronización-de-usuarios-backend_lan) |
| CU-03 | Sincronización automática de usuarios desde el central | [5. Sync de usuarios](#5-pruebas-de-sincronización-de-usuarios-backend_lan) |
| CU-04 | Ver listado de episodios con filtros por tipo | [6. Episodios](#6-pruebas-de-episodios-clínicos) |
| CU-05 | Crear nuevo episodio con paciente sin RUT | [6. Episodios](#6-pruebas-de-episodios-clínicos) |
| CU-06 | Crear nuevo episodio con RUT válido | [6. Episodios](#6-pruebas-de-episodios-clínicos) |
| CU-07 | Validación de RUT inválido | [6. Episodios](#6-pruebas-de-episodios-clínicos) |
| CU-08 | Registrar nota clínica en un episodio | [7. Notas](#7-pruebas-de-notas-clínicas) |
| CU-09 | Sincronización downstream (central → local) | [8. Sincronización](#8-pruebas-de-sincronización-con-el-servidor-central) |
| CU-10 | Sincronización upstream HL7 (local → central) | [8. Sincronización](#8-pruebas-de-sincronización-con-el-servidor-central) |
| CU-11 | Actualización automática de IDs (pid/enctid) | [8. Sincronización](#8-pruebas-de-sincronización-con-el-servidor-central) |
| CU-12 | Activación del modo solo lectura | [9. Modo solo lectura](#9-pruebas-de-modo-solo-lectura) |
| CU-13 | Operación completamente offline | [10. Operación offline](#10-pruebas-de-operación-offline) |
| CU-14 | Reconexión y sincronización de pendientes | [10. Operación offline](#10-pruebas-de-operación-offline) |
| CU-15 | Gestión de usuarios por administrador | [11. Administración](#11-pruebas-de-administración-del-sistema) |
| CU-16 | Configuración de filtros de usuario | [12. Configuración](#12-pruebas-de-configuración-de-usuario) |

---

## 4. Pruebas de autenticación

### PT-AUTH-01: Login exitoso con credenciales locales

**Precondición:** Backend corriendo, usuario `demo` existe con contraseña `demo123`.

**Pasos:**
1. Abrir la aplicación en el navegador.
2. Ingresar usuario: `demo`, contraseña: `demo123`.
3. Hacer clic en "Iniciar sesión".

**Resultado esperado:**
- Redirige a la pantalla de episodios.
- El encabezado muestra el nombre de usuario `demo`.
- No aparece ningún error.

---

### PT-AUTH-02: Login fallido con contraseña incorrecta

**Precondición:** Backend corriendo.

**Pasos:**
1. Ingresar usuario: `demo`, contraseña: `incorrecta`.
2. Hacer clic en "Iniciar sesión".

**Resultado esperado:**
- Permanece en la pantalla de login.
- Se muestra el mensaje "Usuario o contraseña incorrectos" en rojo.
- No se almacena ningún token en localStorage.

---

### PT-AUTH-03: Cierre de sesión

**Precondición:** Usuario autenticado en la pantalla de episodios.

**Pasos:**
1. Hacer clic en "Cerrar sesión" en el encabezado.

**Resultado esperado:**
- Redirige a la pantalla de login.
- El token es eliminado de localStorage.
- Intentar acceder a `/` redirige al login (ruta protegida).

---

### PT-AUTH-04: Acceso a ruta protegida sin autenticación

**Precondición:** Sin sesión activa.

**Pasos:**
1. Navegar directamente a `http://localhost:5173/`.

**Resultado esperado:**
- Redirige automáticamente a `/login`.

---

### PT-AUTH-05: Login de administrador con acceso a sección de admin

**Precondición:** Usuario `admin` con `is_admin=true`.

**Pasos:**
1. Iniciar sesión con `admin` / `admin123`.
2. Hacer clic en el nombre de usuario en el encabezado.

**Resultado esperado:**
- El modal de configuración muestra las pestañas "Configuración", "Filtros" y "Gestión de Usuarios".
- La sección "Configuración del Sistema" es visible en la pestaña Configuración.

---

## 5. Pruebas de sincronización de usuarios (backend_lan)

> Estas pruebas aplican exclusivamente al backend `backend_lan/` con PostgreSQL y JWT.

### PT-USYNC-01: Login con credenciales del servidor central

**Precondición:**
- `backend_lan` en ejecución con PostgreSQL.
- El servidor central TrakCare está disponible.
- El backend ejecutó al menos un ciclo de sincronización de usuarios.

**Pasos:**
1. Esperar al menos 60 segundos desde el inicio del backend (o forzar sincronización).
2. Verificar en los logs que aparece `User sync complete: N created`.
3. Iniciar sesión con un usuario real de TrakCare (ej: `ysilva` / `[contraseña TrakCare]`).

**Resultado esperado:**
- Login exitoso con las credenciales del servidor central.
- El usuario aparece en el sistema sin haberlo creado manualmente.
- El encabezado muestra el username del usuario central.

---

### PT-USYNC-02: Actualización de usuario existente al cambiar contraseña en central

**Precondición:** Usuario `jperez` ya sincronizado en la BD local.

**Pasos:**
1. Cambiar la contraseña de `jperez` en el servidor central TrakCare.
2. Esperar un ciclo de sincronización (máximo 60 segundos) o forzar con `POST /sync/trigger`.
3. Verificar en los logs que aparece `Updated user from central: jperez`.
4. Intentar login con la contraseña anterior.
5. Intentar login con la nueva contraseña.

**Resultado esperado:**
- Login con contraseña anterior falla con "Usuario o contraseña incorrectos".
- Login con nueva contraseña tiene éxito.

---

### PT-USYNC-03: Usuario inactivo en central no puede iniciar sesión

**Precondición:** Usuario activo `plopez` sincronizado en la BD local.

**Pasos:**
1. En el servidor central, marcar al usuario `plopez` como inactivo (`active: N`).
2. Esperar ciclo de sincronización o forzar.
3. Intentar login con `plopez`.

**Resultado esperado:**
- Login falla. No hay acceso aunque la contraseña sea correcta.

---

### PT-USYNC-04: Verificación del formato del hash almacenado

**Precondición:** Al menos un usuario importado del central.

**Pasos:**
1. Consultar la tabla `users` en PostgreSQL:
   ```sql
   SELECT username, hashed_password FROM users WHERE hashed_password LIKE 'pbkdf2central:%';
   ```

**Resultado esperado:**
- El campo `hashed_password` tiene el formato: `pbkdf2central:{base64_salt}:{base64_hash}`.
- No contiene caracteres NUL (`0x00`) ni caracteres no imprimibles.
- El campo no está en doble base64 (el hash decodificado es bytes binarios de 32 bytes, no otro base64).

---

### PT-USYNC-05: Eficiencia del hash de cambio (central_sync_hash)

**Precondición:** Usuario `mfuentes` ya sincronizado.

**Pasos:**
1. Anotar el valor de `central_sync_hash` y `updated_at` de `mfuentes` en la BD.
2. Forzar una nueva sincronización sin que el usuario haya cambiado en el central.
3. Revisar logs.

**Resultado esperado:**
- Los logs muestran `N skipped (no changes)` incluyendo a `mfuentes`.
- El campo `updated_at` del usuario no cambia.
- No se emite ningún `UPDATE` innecesario a la BD.

---

## 6. Pruebas de episodios clínicos

### PT-EP-01: Listar episodios sincronizados desde el central

**Precondición:** Backend con conexión al central. Al menos un ciclo de sync ejecutado.

**Pasos:**
1. Iniciar sesión.
2. Observar la tabla de episodios.

**Resultado esperado:**
- Se muestran episodios con datos reales del servidor central.
- Los episodios aparecen organizados en pestañas por tipo.
- Los episodios del central NO muestran la etiqueta "NUEVO".

---

### PT-EP-02: Crear episodio con RUT válido

**Precondición:** Modo solo lectura desactivado. Botón "Nuevo Episodio" habilitado.

**Pasos:**
1. Hacer clic en "+ Nuevo Episodio".
2. Ingresar:
   - Nombre: `María`
   - Apellidos: `González Pérez`
   - RUT: `12.345.678-9` (RUT válido)
   - Sexo: Femenino
   - Fecha de Nacimiento: `1985-03-15`
   - Tipo de Episodio: Urgencia
   - Unidad Clínica: (seleccionar una disponible)
   - Motivo de Consulta: `Dolor abdominal intenso`
3. Hacer clic en "Crear y Continuar".

**Resultado esperado:**
- El episodio se crea exitosamente.
- Redirige a la pantalla de Nota Clínica del nuevo episodio.
- El episodio aparece en la lista con etiqueta "NUEVO" y estado "Pendiente".
- En máximo 10 segundos, los mensajes HL7 A28 y A01 son enviados al central.

---

### PT-EP-03: Crear episodio sin RUT ("Sin Documento")

**Pasos:**
1. Hacer clic en "+ Nuevo Episodio".
2. Marcar la casilla "Sin Documento".
3. Verificar que el campo RUT queda deshabilitado y vacío.
4. Completar el resto de campos obligatorios.
5. Hacer clic en "Crear y Continuar".

**Resultado esperado:**
- El episodio se crea sin error de validación de RUT.
- El MRN generado usa un timestamp en lugar del RUT.

---

### PT-EP-04: Rechazo de RUT inválido

**Pasos:**
1. Hacer clic en "+ Nuevo Episodio".
2. Ingresar RUT: `12.345.678-0` (dígito verificador incorrecto).
3. Intentar hacer clic en "Crear y Continuar".

**Resultado esperado:**
- Se muestra un mensaje de error en rojo indicando que el RUT es inválido.
- El episodio NO se crea.

---

### PT-EP-05: Campos obligatorios vacíos

**Pasos:**
1. Hacer clic en "+ Nuevo Episodio".
2. Dejar en blanco los campos "Nombre" y "Apellidos".
3. Intentar hacer clic en "Crear y Continuar".

**Resultado esperado:**
- El formulario no se envía o muestra error de validación.
- No se crea ningún episodio.

---

### PT-EP-06: Filtrado por tipo de episodio en la lista

**Precondición:** Existen episodios de tipos Urgencia y Hospitalizado.

**Pasos:**
1. En la pantalla principal, hacer clic en la pestaña "Urgencia".
2. Luego hacer clic en la pestaña "Hospitalizado".

**Resultado esperado:**
- Solo se muestran episodios del tipo seleccionado en cada pestaña.
- El cambio de pestaña es inmediato, sin recarga de página.

---

## 7. Pruebas de notas clínicas

### PT-NOTE-01: Crear nota clínica

**Precondición:** Existe un episodio en la lista.

**Pasos:**
1. Hacer clic en cualquier episodio de la lista.
2. En el área de texto de la nota, escribir: `Paciente refiere dolor leve. Se indica reposo.`
3. Hacer clic en "Guardar Nota".

**Resultado esperado:**
- Aparece el mensaje verde "Nota clínica guardada exitosamente" por 3 segundos.
- La nota aparece en la sección "Notas Clínicas Anteriores" con estado "Pendiente".
- En máximo 10 segundos, el estado cambia a "Enviado" (si hay conexión).

---

### PT-NOTE-02: Visualización de múltiples notas

**Precondición:** Un episodio con 3 o más notas guardadas.

**Pasos:**
1. Abrir el episodio.

**Resultado esperado:**
- Todas las notas se muestran en orden cronológico descendente.
- Cada nota muestra autor, fecha, estado y texto.
- El campo "author_nombre" se muestra debajo del texto si está disponible.

---

### PT-NOTE-03: Botón deshabilitado sin texto

**Pasos:**
1. Abrir un episodio.
2. Observar el botón "Guardar Nota" con el área de texto vacía.
3. Escribir solo espacios en el área de texto.

**Resultado esperado:**
- El botón "Guardar Nota" permanece deshabilitado con área de texto vacía o con solo espacios.

---

### PT-NOTE-04: El nombre del autor queda registrado en la nota

**Precondición:** El usuario `demo` tiene configurado el campo "Nombre Completo" = "Dr. Carlos Demo".

**Pasos:**
1. Iniciar sesión como `demo`.
2. Abrir un episodio y guardar una nota.

**Resultado esperado:**
- La nota muestra "Dr. Carlos Demo" en el campo de autor debajo del texto.
- Si se cambia el nombre del usuario posteriormente, la nota mantiene el nombre original (snapshot).

---

## 8. Pruebas de sincronización con el servidor central

### PT-SYNC-01: Sincronización downstream automática (central → local)

**Precondición:** Conexión activa al servidor central o al central_mock.

**Pasos:**
1. Crear un nuevo episodio directamente en el servidor central (o central_mock).
2. Esperar hasta 60 segundos.
3. Observar la lista de episodios en TrakCare Offline.

**Resultado esperado:**
- El episodio creado en el central aparece en la lista.
- El panel de sincronización actualiza la hora en "Recepción datos (GET)".
- El episodio NO muestra la etiqueta "NUEVO".

---

### PT-SYNC-02: Sincronización manual forzada

**Pasos:**
1. Hacer clic en el botón de sincronización (ícono de flechas circulares) en el encabezado.

**Resultado esperado:**
- El panel de sincronización actualiza la hora inmediatamente.
- Los eventos pendientes (si existen) son procesados.
- La hora en "Recepción datos (GET)" y "Envío HL7 (POST)" se actualiza.

---

### PT-SYNC-03: Envío de mensajes HL7 al crear episodio (upstream)

**Precondición:** Conexión al servidor central. Logs del backend visibles.

**Pasos:**
1. Crear un nuevo episodio desde TrakCare Offline.
2. Observar los logs del backend y el central_mock.

**Resultado esperado:**
- En los logs del backend aparece `SENDING HL7 MESSAGE` con los mensajes ADT^A28 y ADT^A01.
- En el central_mock, los mensajes son recibidos y almacenados.
- El episodio en la lista pasa de "Pendiente" a "Sincronizado" en menos de 10 segundos.

---

### PT-SYNC-04: Actualización automática de IDs (pid y enctid)

**Precondición:** El central_mock está configurado para responder con `{"estado":"200","pid":"TC123456","enctid":"ENC789"}`.

**Pasos:**
1. Crear un nuevo episodio. Anotar el MRN y número de episodio generado localmente.
2. Guardar una nota clínica en ese episodio.
3. Esperar hasta 15 segundos.

**Resultado esperado:**
- El MRN del episodio se actualiza con el valor `TC123456`.
- El número de episodio se actualiza con `ENC789`.
- La etiqueta "NUEVO" desaparece del episodio.
- El estado de la nota cambia a "Enviado".

---

### PT-SYNC-05: Reintentos automáticos al fallar el envío

**Precondición:** El servidor central está temporalmente no disponible.

**Pasos:**
1. Detener el servidor central (o central_mock).
2. Crear un nuevo episodio en TrakCare Offline.
3. Esperar 2 minutos.
4. Verificar el estado del evento en `GET /sync/stats`.
5. Reiniciar el servidor central.
6. Esperar hasta 10 segundos.

**Resultado esperado:**
- El evento permanece en estado "pending" mientras el central no responde.
- Los logs muestran intentos fallidos con `retry_count` incrementando.
- Al recuperar la conexión, el evento es enviado exitosamente en el siguiente ciclo.
- El episodio pasa a "Sincronizado".

---

### PT-SYNC-06: Contenido del mensaje HL7 A01

**Precondición:** Logs del central_mock habilitados.

**Pasos:**
1. Crear un episodio con:
   - Paciente: `Ana López`
   - Tipo: Urgencia
   - Unidad Clínica: `Urgencias`
   - Habitación: `Box 5`
   - Motivo de Consulta: `Fiebre alta`
2. Revisar el mensaje ADT^A01 recibido en el central_mock.

**Resultado esperado:**
- Segmento `PID` contiene nombre en formato `Apellido^Nombre`.
- Segmento `PV1.3` contiene `Urgencias^Box 5`.
- Segmento `PV2.3` contiene `Fiebre alta`.
- Los campos MSH, EVN, PID, PV1, PV2, OBR, OBX están presentes.

---

### PT-SYNC-07: Filtros de usuario aplicados al sync downstream

**Precondición:** Usuario con filtro configurado: `Tipo = Urgencia`.

**Pasos:**
1. Configurar el filtro en la pestaña "Filtros" del modal de usuario.
2. Guardar y esperar sincronización.
3. Verificar la lista de episodios.

**Resultado esperado:**
- Solo aparecen episodios de tipo "Urgencia" en la lista.
- Episodios de otros tipos no se descargan.

---

## 9. Pruebas de modo solo lectura

### PT-RO-01: Activación del modo solo lectura

**Precondición:** Servidor central disponible. Usuario administrador autenticado.

**Pasos:**
1. Abrir configuración de usuario (clic en username).
2. En "Configuración del Sistema", marcar "Habilitar Modo Solo Lectura (Todo el Sistema)".
3. Hacer clic en "Guardar".
4. Cerrar sesión e iniciar sesión nuevamente como usuario `demo`.

**Resultado esperado:**
- Al iniciar sesión, aparece el aviso ámbar "Modo Solo Lectura Activado".
- En la pantalla de episodios, aparece el banner ámbar.
- El botón "Nuevo Episodio" está deshabilitado (gris).
- Al abrir una nota, el área de texto está deshabilitada.
- El botón "Guardar Nota" está deshabilitado.

---

### PT-RO-02: El modo solo lectura no se activa sin conexión central

**Precondición:** Modo solo lectura habilitado por admin. Servidor central detenido.

**Pasos:**
1. Detener el servidor central.
2. Cerrar sesión e iniciar sesión nuevamente.

**Resultado esperado:**
- El indicador de conexión muestra "OFFLINE".
- NO aparece el aviso de modo solo lectura.
- El botón "Nuevo Episodio" está habilitado (si el admin lo habilitó).
- El área de texto para notas está habilitada.

---

### PT-RO-03: Desactivación del modo solo lectura

**Precondición:** Modo solo lectura activo.

**Pasos:**
1. Iniciar sesión como administrador.
2. En configuración del sistema, desmarcar "Habilitar Modo Solo Lectura".
3. Guardar.
4. Esperar 10 segundos.

**Resultado esperado:**
- Sin necesidad de cerrar sesión, el banner ámbar desaparece.
- El botón "Nuevo Episodio" vuelve a habilitarse.
- El área de texto para notas vuelve a habilitarse.

> Los cambios se aplican en el siguiente ciclo de verificación (cada 8 segundos).

---

### PT-RO-04: Usuario regular no puede modificar la configuración del sistema

**Precondición:** Usuario `demo` sin permisos de administrador.

**Pasos:**
1. Iniciar sesión como `demo`.
2. Abrir el modal de configuración.

**Resultado esperado:**
- La pestaña "Gestión de Usuarios" NO es visible.
- La sección "Configuración del Sistema" NO es visible.
- El intento de llamar `PUT /settings` directamente retorna 403.

---

## 10. Pruebas de operación offline

### PT-OFF-01: Crear episodio sin conexión al central

**Precondición:** Servidor central no disponible. Botón "Nuevo Episodio" habilitado.

**Pasos:**
1. Detener el servidor central.
2. Verificar que el indicador muestra "OFFLINE".
3. Crear un nuevo episodio completo.
4. Guardar una nota clínica.

**Resultado esperado:**
- El episodio se crea sin errores.
- La nota se guarda sin errores.
- Ambos aparecen con estado "Pendiente".
- El panel muestra los eventos pendientes (número > 0).

---

### PT-OFF-02: Sincronización de pendientes al recuperar conexión

**Precondición:** Existen episodios y notas con estado "Pendiente" creados offline.

**Pasos:**
1. Reiniciar el servidor central.
2. Esperar hasta 10 segundos.
3. Observar el panel de sincronización y los estados de los episodios.

**Resultado esperado:**
- Los eventos pendientes se envían automáticamente.
- Los episodios y notas cambian a estado "Sincronizado".
- El contador de eventos pendientes baja a 0.
- El IDs (MRN y num_episodio) se actualizan con los valores del central.

---

### PT-OFF-03: Múltiples episodios pendientes — orden de envío

**Precondición:** Servidor central detenido.

**Pasos:**
1. Crear 3 episodios consecutivos offline.
2. Reiniciar el servidor central.
3. Observar el orden de procesamiento en los logs.

**Resultado esperado:**
- Los episodios se envían en orden de creación (FIFO por prioridad).
- No se mezclan mensajes de distintos episodios.
- Todos terminan sincronizados correctamente.

---

### PT-OFF-04: Persistencia de datos al reiniciar el backend

**Precondición:** Existen episodios creados localmente (estado "Pendiente").

**Pasos:**
1. Detener el backend Python.
2. Reiniciar el backend.
3. Verificar la lista de episodios.

**Resultado esperado:**
- Todos los episodios y notas creados antes del reinicio siguen visibles.
- Los eventos en estado "pending" son procesados automáticamente tras el reinicio (el startup reset los pone a pending si estaban en failed).

---

## 11. Pruebas de administración del sistema

### PT-ADM-01: Crear nuevo usuario local

**Precondición:** Sesión de administrador activa.

**Pasos:**
1. Abrir configuración → pestaña "Gestión de Usuarios".
2. Hacer clic en "Crear Nuevo Usuario".
3. Ingresar:
   - Usuario: `enf_maria`
   - Contraseña: `segura123`
   - Nombre Completo: `María Enfermera`
   - Es administrador: NO
4. Hacer clic en "Crear".

**Resultado esperado:**
- Mensaje verde "Usuario creado correctamente".
- El usuario aparece en la lista con estado "Activo".
- Es posible iniciar sesión con `enf_maria` / `segura123`.

---

### PT-ADM-02: Crear usuario administrador

**Pasos:**
1. Repetir PT-ADM-01 marcando "Es administrador".

**Resultado esperado:**
- El nuevo usuario aparece con la etiqueta azul "Administrador".
- Al iniciar sesión, el nuevo usuario ve las opciones de administración.

---

### PT-ADM-03: Habilitar y deshabilitar el botón "Nuevo Episodio"

**Pasos:**
1. Verificar que el botón "Nuevo Episodio" no es visible para `demo`.
2. Como administrador, habilitar "Habilitar botón Nuevo Episodio".
3. Guardar. Iniciar sesión como `demo`.

**Resultado esperado:**
- El botón aparece visible para `demo`.
- Al deshabilitarlo nuevamente, el botón desaparece para todos los usuarios.

---

## 12. Pruebas de configuración de usuario

### PT-CFG-01: Cambio de nombre completo

**Pasos:**
1. Abrir configuración → pestaña "Configuración".
2. Cambiar "Nombre Completo" a `Dr. Juan Prueba`.
3. Guardar.
4. Crear una nueva nota clínica.

**Resultado esperado:**
- La nota creada muestra "Dr. Juan Prueba" como nombre del autor.
- Las notas anteriores mantienen el nombre anterior (snapshot histórico).

---

### PT-CFG-02: Cambio de contraseña

**Pasos:**
1. Abrir configuración.
2. Ingresar nueva contraseña en "Nueva Contraseña" y confirmarla.
3. Guardar.
4. Cerrar sesión.
5. Intentar login con contraseña anterior.
6. Intentar login con nueva contraseña.

**Resultado esperado:**
- Login con contraseña anterior falla.
- Login con nueva contraseña tiene éxito.

---

### PT-CFG-03: Contraseñas que no coinciden

**Pasos:**
1. Ingresar "Nueva Contraseña": `abc123`.
2. Ingresar "Confirmar Contraseña": `xyz789`.
3. Hacer clic en "Guardar".

**Resultado esperado:**
- Aparece un error indicando que las contraseñas no coinciden.
- La contraseña NO se actualiza.

---

### PT-CFG-04: Configuración de filtros y efecto en sync

**Pasos:**
1. Abrir configuración → pestaña "Filtros".
2. Configurar Tipo: `Hospitalizado`.
3. Guardar.
4. Observar la lista de episodios después de la sincronización.

**Resultado esperado:**
- La lista solo muestra episodios de tipo "Hospitalizado" descargados del central.
- Episodios de otros tipos no aparecen en la descarga.

---

## 13. Pruebas de interfaz y usabilidad

### PT-UI-01: Cambio de idioma en tiempo real

**Pasos:**
1. Hacer clic en el botón "ES" en el encabezado.
2. Seleccionar "EN".

**Resultado esperado:**
- Todos los textos de la interfaz cambian al inglés inmediatamente.
- Sin recarga de página.
- El idioma persiste al navegar entre páginas.
- El idioma persiste al cerrar y reabrir la aplicación.

---

### PT-UI-02: Cambio de tema claro/oscuro

**Pasos:**
1. Hacer clic en el botón de luna/sol en el encabezado.

**Resultado esperado:**
- La interfaz cambia de tema inmediatamente.
- El cambio persiste al navegar entre páginas.
- Todos los textos mantienen contraste legible en ambos temas.

---

### PT-UI-03: Actualización automática de la lista (15 segundos)

**Pasos:**
1. Dejar la pantalla de episodios abierta.
2. Crear un episodio directamente en el servidor central o via API.
3. Esperar hasta 75 segundos (60s sync + 15s refresh).

**Resultado esperado:**
- El nuevo episodio aparece en la lista sin necesidad de recargar la página.

---

### PT-UI-04: Combobox de Unidad Clínica — filtrado por tipo

**Pasos:**
1. En "Nuevo Episodio", seleccionar Tipo "Urgencia".
2. Hacer clic en el campo "Unidad Clínica".
3. Escribir parte del nombre de una unidad.

**Resultado esperado:**
- Solo aparecen unidades asociadas al tipo "Urgencia".
- El filtrado en tiempo real funciona al escribir.
- Al cambiar el Tipo a "Hospitalizado", el campo Unidad Clínica se limpia.

---

## 14. Pruebas de seguridad

### PT-SEC-01: No acceso a datos sin token

**Pasos:**
1. Hacer una solicitud directa: `GET http://localhost:8000/episodes` sin header de autorización.

**Resultado esperado:**
- Respuesta HTTP 401 o 403.
- No se retornan datos de episodios.

---

### PT-SEC-02: Usuario regular no puede modificar settings

**Pasos:**
1. Autenticarse como usuario `demo`.
2. Intentar: `PUT http://localhost:8000/settings` con `{"enable_read_only_mode": false}`.

**Resultado esperado:**
- Respuesta HTTP 403 Forbidden.
- La configuración no cambia.

---

### PT-SEC-03: Token inválido rechazado (backend_lan)

**Pasos:**
1. Hacer una solicitud con header `Authorization: Bearer token_inventado`.

**Resultado esperado:**
- Respuesta HTTP 401.
- No se retornan datos.

---

### PT-SEC-04: Token de sesión expirado (backend_lan)

**Precondición:** Token con expiración de 480 minutos.

**Pasos:**
1. Autenticarse y obtener token.
2. Modificar manualmente la fecha de expiración del token para que esté vencido (o esperar expiración natural en entorno de prueba con expiración reducida).
3. Intentar `GET /episodes` con el token vencido.

**Resultado esperado:**
- Respuesta HTTP 401.
- La aplicación redirige automáticamente al login.

---

## 15. Criterios de aceptación globales

| Criterio | Condición de aceptación |
|---|---|
| **Disponibilidad offline** | El sistema crea episodios y notas sin conexión al central. Los datos no se pierden. |
| **Sincronización confiable** | Los episodios y notas creados offline se sincronizan en menos de 10 segundos al recuperar la conexión. |
| **Integridad de mensajes HL7** | Los mensajes ADT^A28, ADT^A01 y ORU^R01 son aceptados por el servidor central sin errores. |
| **Actualización de IDs** | El MRN y num_episodio se actualizan automáticamente con los IDs del central tras el envío del ORU^R01. |
| **Sincronización de usuarios** | Los usuarios del central pueden iniciar sesión con sus credenciales habituales en máximo 60 segundos desde que el backend inicia. |
| **Verificación PBKDF2** | Las contraseñas de usuarios del central se verifican correctamente usando PBKDF2-SHA1 / 2500 iteraciones. |
| **Modo solo lectura** | Cuando está activo, ningún usuario (excepto el admin) puede crear episodios o notas. Se desactiva automáticamente al perder conexión con el central. |
| **Seguridad** | Ningún endpoint retorna datos sin autenticación válida. Los usuarios regulares no pueden acceder a funciones de admin. |
| **Filtros de usuario** | Los filtros configurados se aplican correctamente al descargar episodios del servidor central. |
| **Persistencia** | Los datos sobreviven un reinicio del backend. Los eventos pendientes se procesan al reiniciar. |
| **Usabilidad** | El cambio de idioma y tema es inmediato. La lista de episodios se actualiza automáticamente cada 15 segundos. |
