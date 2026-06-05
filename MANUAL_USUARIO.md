# Manual de Usuario — TrakCare Offline v2.5.0-rc10-stable

Sistema de contingencia clínica para gestión offline de episodios y notas clínicas con sincronización automática al servidor central TrakCare.

---

## Tabla de Contenidos

1. [Conceptos clave](#1-conceptos-clave)
2. [Inicio de sesión](#2-inicio-de-sesión)
3. [Pantalla principal — Lista de Episodios](#3-pantalla-principal--lista-de-episodios)
4. [Crear un nuevo episodio](#4-crear-un-nuevo-episodio)
5. [Nota Clínica](#5-nota-clínica)
6. [Sincronización con el servidor central](#6-sincronización-con-el-servidor-central)
7. [Modo Solo Lectura](#7-modo-solo-lectura)
8. [Configuración de usuario](#8-configuración-de-usuario)
9. [Administración del sistema (solo administradores)](#9-administración-del-sistema-solo-administradores)
10. [Preguntas frecuentes](#10-preguntas-frecuentes)

---

## 1. Conceptos clave

### Qué es TrakCare Offline

TrakCare Offline es una aplicación de contingencia clínica. Permite registrar episodios de atención y notas clínicas cuando el sistema central TrakCare no está disponible o cuando se necesita operar de forma independiente. Una vez que se recupera la conexión, todos los datos registrados se sincronizan automáticamente con el servidor central.

### Modos de operación

| Indicador en el encabezado | Significado |
|---|---|
| Punto verde + **ONLINE** | El sistema local está activo y con conexión al servidor central. |
| Punto rojo + **OFFLINE** | El sistema local está activo pero sin conexión al servidor central. |

El sistema **siempre funciona** independientemente del estado del servidor central. La diferencia está en si los datos se sincronizan en tiempo real o se encolan para sincronizar cuando se recupere la conexión.

### Sincronización automática

- El sistema descarga episodios del servidor central cada 60 segundos.
- Los episodios y notas que se crean localmente se envían al servidor central cada 10 segundos.
- No se requiere ninguna acción manual para sincronizar, aunque existe un botón de sincronización forzada.

---

## 2. Inicio de sesión

### Credenciales

Use el nombre de usuario y contraseña asignados por el administrador del sistema. Si el sistema está integrado con el servidor central TrakCare, puede iniciar sesión con sus mismas credenciales del sistema central.

### Pasos

1. Ingrese su **nombre de usuario** en el campo "Usuario".
2. Ingrese su **contraseña** en el campo "Contraseña".
3. Haga clic en **Iniciar sesión**.

### Alertas al ingresar

Si al iniciar sesión aparece un aviso amarillo titulado **"Modo Solo Lectura Activado"**, significa que el servidor central está disponible y el administrador ha activado el modo de solo lectura. En este estado solo podrá consultar información; no podrá crear episodios ni notas clínicas. Consulte la sección [Modo Solo Lectura](#7-modo-solo-lectura).

### Errores comunes

| Mensaje | Causa | Solución |
|---|---|---|
| "Usuario o contraseña incorrectos" | Credenciales inválidas | Verifique usuario y contraseña. Contacte al administrador si el problema persiste. |
| Pantalla "Backend No Disponible" | El servidor local no está corriendo | Inicie el backend según las instrucciones del administrador. |

---

## 3. Pantalla principal — Lista de Episodios

Esta es la pantalla principal de la aplicación. Muestra todos los episodios clínicos disponibles y el estado de sincronización del sistema.

### Encabezado de la aplicación

El encabezado superior contiene:

- **Nombre de la aplicación**: "TrakCare Offline" con el indicador de conexión al servidor central.
- **Botón de idioma** (ES / EN): Cambia el idioma de la interfaz. El cambio es inmediato y se recuerda entre sesiones.
- **Botón de tema**: Alterna entre modo claro y modo oscuro.
- **Nombre de usuario**: Al hacer clic, abre la configuración de usuario.
- **Cerrar sesión**: Cierra la sesión actual.

### Panel de estado de sincronización

El panel de color gris oscuro muestra el estado de comunicación con el servidor central:

| Campo | Descripción |
|---|---|
| **Estado de conexión** | Verde (CONECTADO) o rojo (SIN CONEXIÓN) con el servidor central. |
| **Recepción datos (GET)** | Hora de la última descarga de episodios desde el servidor central. Muestra "Nunca" si no se ha sincronizado. |
| **Envío HL7 (POST)** | Hora del último envío de datos al servidor central. |
| **Eventos pendientes** | Número de episodios o notas que aún no se han enviado al servidor central. Aparece en ámbar cuando hay eventos pendientes. |

### Pestañas por tipo de episodio

La lista de episodios se organiza en pestañas según el tipo: **Urgencia**, **Hospitalizado**, **Ambulatorio**, **Pabellón**, etc. Los tipos disponibles se generan automáticamente a partir de los episodios existentes en el sistema.

### Tabla de episodios

Cada fila representa un episodio. Las columnas son:

| Columna | Descripción |
|---|---|
| **Paciente** | Nombre del paciente. Si aparece la etiqueta **"NUEVO"** en naranja, el episodio fue creado localmente y aún no se ha confirmado con el servidor central. |
| **RUN** | RUT del paciente (puede estar vacío si se registró como "Sin Documento"). |
| **Episodio** | Número de episodio asignado. |
| **Profesional** | Profesional responsable del episodio. |
| **Ubicación** | Unidad clínica y/o habitación/box. |
| **Fecha Atención** | Fecha y hora del episodio. |
| **Estado** | Verde "Activo" o ámbar "Pendiente" (tiene notas sin sincronizar). |
| **Sincronización** | Verde "Sincronizado" o ámbar "Pendiente (N)" con el número de notas pendientes. |

### Navegar a un episodio

Haga clic en cualquier fila de la tabla para abrir la nota clínica del episodio.

### Botón "Nuevo Episodio"

El botón **"+ Nuevo Episodio"** solo es visible si el administrador lo ha habilitado. Si está visible pero aparece deshabilitado (color gris), se debe a que el sistema está en modo solo lectura.

---

## 4. Crear un nuevo episodio

> Esta función solo está disponible cuando el administrador ha habilitado el botón "Nuevo Episodio" y el sistema no está en modo solo lectura.

Haga clic en **"+ Nuevo Episodio"** para abrir el formulario de creación.

### Sección: Datos del Paciente

| Campo | Obligatorio | Descripción |
|---|---|---|
| **Nombre** | Sí | Nombre(s) del paciente. |
| **Apellidos** | Sí | Apellido(s) del paciente. |
| **RUT** | No | RUT del paciente. Se formatea automáticamente al escribir (puntos y guión). Si el paciente no tiene documento de identidad, marque la casilla **"Sin Documento"** para dejarlo vacío. |
| **Sexo** | Sí | Masculino / Femenino / Otro / Desconocido. |
| **Fecha de Nacimiento** | Sí | Selector de fecha. |

#### Validación del RUT

El sistema valida automáticamente el dígito verificador del RUT. Si el RUT es inválido, se muestra un mensaje de error en rojo. En ese caso verifique el número o marque "Sin Documento" si corresponde.

### Sección: Datos del Episodio

| Campo | Obligatorio | Descripción |
|---|---|---|
| **Tipo de Episodio** | Sí | Dropdown con los tipos disponibles en el sistema (Urgencia, Hospitalizado, Ambulatorio, Pabellón). Los tipos se cargan dinámicamente desde la base de datos. |
| **Habitación/Box** | No | Ubicación física del paciente, por ejemplo: "Box 3" o "Habitación 201". |
| **Unidad Clínica** | No | Selector con búsqueda. Las opciones se filtran según el Tipo de Episodio seleccionado. Escriba para buscar entre las ubicaciones disponibles. Si aparece "No hay ubicaciones disponibles", sincronice primero con el servidor central. |
| **Motivo de Consulta** | No | Texto libre describiendo el motivo de la atención. Se incluye en los mensajes enviados al servidor central. |

#### Cómo usar el selector de Unidad Clínica

1. Seleccione primero el **Tipo de Episodio**.
2. Haga clic en el campo **Unidad Clínica**. Se desplegará la lista de ubicaciones disponibles para ese tipo.
3. Puede escribir para filtrar las opciones.
4. Haga clic en la ubicación deseada para seleccionarla.
5. Si cambia el Tipo de Episodio, el campo Unidad Clínica se limpiará automáticamente.

### Guardar el episodio

Haga clic en **"Crear y Continuar"**. El sistema:

1. Crea el episodio en la base de datos local.
2. Genera y encola los mensajes HL7 para el servidor central (ADT^A28 y ADT^A01).
3. Redirige automáticamente a la pantalla de Nota Clínica del nuevo episodio.

Si hay un error, se mostrará en un recuadro rojo en la parte inferior del formulario.

---

## 5. Nota Clínica

La pantalla de Nota Clínica permite ver el detalle del episodio, consultar notas anteriores y registrar una nueva nota.

### Información del episodio

El recuadro azul en la parte superior muestra los datos del paciente y del episodio: nombre, sexo, fecha de nacimiento, fecha de atención, tipo de episodio, profesional responsable, motivo de consulta y ubicación.

### Notas clínicas anteriores

Si el episodio tiene notas previas, se muestran en orden cronológico (de la más reciente a la más antigua). Cada nota indica:

- **Autor y fecha** de creación.
- **Estado de sincronización**:
  - Verde "Enviado": La nota fue enviada y confirmada por el servidor central.
  - Ámbar "Pendiente": La nota está en cola para ser enviada.

### Registrar una nueva nota

1. Escriba el texto de la nota en el área de texto grande.
2. El contador de caracteres se actualiza en tiempo real.
3. Haga clic en **"Guardar Nota"** cuando esté listo.
4. Aparecerá un mensaje verde de confirmación y la nota quedará visible en la sección de notas anteriores con estado "Pendiente".
5. El sistema enviará la nota al servidor central en el siguiente ciclo (máximo 10 segundos).

> **Nota:** El botón "Guardar Nota" está deshabilitado si el área de texto está vacía o si el sistema está en modo solo lectura.

---

## 6. Sincronización con el servidor central

### Cómo funciona

TrakCare Offline mantiene una sincronización continua con el servidor central TrakCare mediante mensajes HL7 v2.3:

| Dirección | Frecuencia | Descripción |
|---|---|---|
| Central → Local | Cada 60 segundos | Descarga episodios del servidor central. Actualiza la lista de episodios visible en la aplicación. |
| Local → Central | Cada 10 segundos | Envía episodios y notas creados localmente. Usa mensajes ADT^A28 (datos del paciente), ADT^A01 (admisión) y ORU^R01 (notas clínicas). |

### Actualización automática de IDs

Cuando el servidor central confirma la recepción de un nuevo episodio, responde con el ID del paciente (`pid`) y el ID del episodio (`enctid`) según los registros de TrakCare. La aplicación actualiza automáticamente el MRN y el número de episodio con estos valores. La etiqueta "NUEVO" del episodio desaparece al completarse este proceso.

### Sincronización manual

Para forzar una sincronización inmediata, haga clic en el botón de sincronización en el encabezado (ícono de flechas circulares). Esto ejecuta tanto la descarga (Central → Local) como el envío (Local → Central) de forma inmediata.

### Reintentos automáticos

Si el envío de un mensaje al servidor central falla, el sistema lo reintenta automáticamente hasta 5 veces. Los eventos fallidos también se reintentan al reiniciar el servidor. El estado de los eventos puede consultarse en el panel de sincronización de la pantalla principal.

### Filtros de sincronización

Cada usuario puede configurar filtros que se aplican al descargar episodios desde el servidor central (por tipo de episodio, hospital, unidad clínica o profesional). Consulte la sección [Configuración de usuario — Pestaña Filtros](#pestaña-filtros).

---

## 7. Modo Solo Lectura

### Qué es

El Modo Solo Lectura es una protección que impide la creación de nuevos datos cuando el servidor central TrakCare está disponible. Su propósito es evitar duplicación de registros: si el sistema central está operativo, los episodios deben crearse directamente en TrakCare y no en la aplicación de contingencia.

### Cuándo se activa

El modo solo lectura se activa **solo si el administrador lo ha habilitado** en la configuración del sistema. Si el administrador no lo ha habilitado, el sistema permite crear episodios y notas incluso con el servidor central en línea.

Condiciones para que se active:
1. El administrador tiene habilitada la opción "Habilitar Modo Solo Lectura (Todo el Sistema)".
2. El sistema detecta conexión activa con el servidor central.

Si el servidor central se desconecta, el modo solo lectura se desactiva automáticamente y puede volver a crear episodios y notas.

### Efectos visibles

| Donde | Qué cambia |
|---|---|
| **Al iniciar sesión** | Aparece una alerta ámbar explicando las restricciones. |
| **Lista de Episodios** | Aparece un banner ámbar. El botón "Nuevo Episodio" queda deshabilitado. |
| **Nota Clínica** | Aparece un banner ámbar. El área de texto queda deshabilitada (gris). El botón "Guardar Nota" queda deshabilitado. |

### Qué sigue disponible en modo solo lectura

- Navegar y consultar todos los episodios.
- Leer todas las notas clínicas.
- Ver el estado de sincronización.
- Configurar preferencias de usuario (nombre, contraseña, filtros).

---

## 8. Configuración de usuario

Haga clic en su nombre de usuario en el encabezado para abrir el modal de configuración. Tiene dos pestañas disponibles: **Configuración** y **Filtros**.

### Pestaña Configuración

Permite actualizar sus datos personales:

| Campo | Obligatorio | Descripción |
|---|---|---|
| **Usuario** | — | Solo lectura. Muestra su nombre de usuario actual. No es editable. |
| **Nombre Completo** | No | Su nombre real tal como aparecerá registrado en las notas clínicas que cree. Si lo deja vacío, las notas mostrarán solo el nombre de usuario. |
| **Nueva Contraseña** | No | Ingrese aquí la nueva contraseña si desea cambiarla. Deje este campo vacío para mantener la contraseña actual. |
| **Confirmar Contraseña** | No | Debe coincidir exactamente con el campo "Nueva Contraseña". Si ambos campos están vacíos, la contraseña no se modifica. |

Haga clic en **Guardar** para aplicar los cambios. Aparecerá un mensaje verde de confirmación.

> **Nota para usuarios del servidor central TrakCare:** Si su cuenta fue importada automáticamente desde el sistema central, puede cambiar su contraseña local desde aquí. El cambio no afecta su contraseña en el sistema central.

---

### Pestaña Filtros

Los filtros tienen dos propósitos: identificar al profesional en los mensajes HL7 enviados al servidor central, y determinar qué episodios se descargan desde el servidor central. Cada usuario puede tener su propio conjunto de filtros.

#### Campo: Usuario ORU

Este campo contiene el identificador del profesional que se incluye en el campo técnico `OBR.24` de todos los mensajes **HL7 ORU^R01** (notas clínicas) enviados al servidor central TrakCare. Es el código con el que TrakCare reconoce al profesional emisor del mensaje.

| Ejemplo | Descripción |
|---|---|
| `dr.garcia` | Código del profesional en TrakCare |
| `mfuentes` | Nombre de usuario en el sistema central |

Si este campo está vacío, el mensaje HL7 se enviará sin identificador de profesional en `OBR.24`. Se recomienda completarlo para una correcta trazabilidad en TrakCare.

#### Filtros de episodios

Estos filtros se aplican cada vez que el sistema descarga episodios desde el servidor central (sincronización downstream). Permiten que cada profesional vea solo los episodios relevantes a su unidad, servicio o asignación.

| Filtro | Ejemplo de valor | Efecto al configurarlo |
|---|---|---|
| **Tipo** | `Ambulatorio` | Solo descarga episodios del tipo indicado. |
| **Hospital** | `TCE HOSPITAL BASE` | Solo descarga episodios del hospital indicado. |
| **Local / Unidad** | `Unidad Emergencia Adultos` | Solo descarga episodios de esa unidad clínica. |
| **Profesional** | `Dr. Juan Pérez` | Solo descarga episodios asignados a ese profesional. |

Los valores deben coincidir exactamente con los valores que usa el servidor central. Deje un campo vacío para no filtrar por ese criterio: un campo vacío descarga episodios de cualquier valor para ese atributo.

**Ejemplo de uso:** Un enfermero de la Unidad de Emergencia Adultos del Hospital Base configuraría:
- Tipo: *(vacío — todos los tipos)*
- Hospital: `TCE HOSPITAL BASE`
- Local / Unidad: `Unidad Emergencia Adultos`
- Profesional: *(vacío — todos los profesionales de esa unidad)*

#### Guardar los filtros

Haga clic en **Guardar filtros**. Al guardar, el sistema ejecuta automáticamente una sincronización inmediata con el servidor central para cargar los episodios según los nuevos criterios. El resultado se verá reflejado en la lista de episodios en pocos segundos.

---

## 9. Administración del sistema (solo administradores)

Los usuarios con rol de administrador tienen acceso a opciones adicionales en el modal de configuración.

### Pestaña Configuración — Sección "Configuración del Sistema"

#### Modo Solo Lectura global

**Casilla: "Habilitar Modo Solo Lectura (Todo el Sistema)"**

Cuando está marcada y el servidor central está en línea, **todos los usuarios** del sistema entran en modo solo lectura. Úsela para prevenir registros duplicados cuando el sistema central está operativo.

Desmarcar esta opción permite que todos los usuarios creen episodios y notas incluso con el servidor central disponible (útil en situaciones especiales o durante pruebas).

#### Botón "Nuevo Episodio"

**Casilla: "Habilitar botón Nuevo Episodio"**

Controla si el botón de creación de episodios es visible para todos los usuarios. Por defecto está desactivado. Actívelo solo cuando se requiera que los usuarios creen episodios desde la aplicación de contingencia.

### Pestaña Gestión de Usuarios

Muestra la lista completa de usuarios del sistema con su nombre, rol y estado (activo/inactivo).

#### Crear un nuevo usuario

1. Haga clic en **"Crear Nuevo Usuario"**.
2. Complete los campos:
   - **Usuario**: nombre de usuario para iniciar sesión (sin espacios ni caracteres especiales).
   - **Contraseña**: contraseña inicial.
   - **Nombre Completo**: nombre real del profesional (opcional, aparece en notas clínicas).
   - **Es administrador**: marque si el usuario debe tener acceso a la administración del sistema.
3. Haga clic en **"Crear"**.

> Los usuarios importados desde el servidor central TrakCare se crean automáticamente y no requieren gestión manual. Sus contraseñas son las mismas que usan en el sistema central.

---

## 10. Preguntas frecuentes

**¿Qué pasa si creo un episodio y el servidor central no está disponible?**
El episodio se guarda en la base de datos local y queda en cola con estado "Pendiente". Cuando se recupere la conexión, el sistema lo enviará automáticamente al servidor central en el siguiente ciclo de sincronización (máximo 10 segundos).

**¿Puedo ver en tiempo real si mis datos se enviaron al servidor central?**
Sí. En la pantalla principal, el panel de sincronización muestra la hora del último envío y el número de eventos pendientes. En la pantalla de nota clínica, cada nota muestra el estado "Enviado" o "Pendiente".

**¿La etiqueta "NUEVO" en un episodio significa que hay un error?**
No. Significa que el episodio fue creado localmente y que el servidor central aún no ha respondido con el ID oficial (MRN y número de episodio de TrakCare). La etiqueta desaparece automáticamente cuando el servidor confirma la recepción y responde con los IDs.

**¿Qué significa "eventos pendientes" en el panel de sincronización?**
Cada episodio creado o nota guardada genera uno o más "eventos" que deben enviarse al servidor central. El número de eventos pendientes indica cuántos están en cola. En condiciones normales este número baja rápidamente (en segundos) si hay conexión al servidor central.

**¿Puedo cambiar el idioma de la aplicación?**
Sí. Haga clic en el botón **ES / EN** en el encabezado para alternar entre español e inglés. El cambio es inmediato y se recuerda en futuras sesiones.

**¿Por qué no puedo crear episodios si el sistema central está en línea?**
El administrador del sistema puede haber activado el Modo Solo Lectura, que impide crear nuevos registros cuando el central está disponible. Contacte al administrador si necesita crear episodios en este estado.

**¿Qué tipos de mensajes se envían al servidor central?**

| Mensaje HL7 | Cuándo se envía |
|---|---|
| ADT^A28 | Al crear un nuevo episodio (información del paciente). |
| ADT^A01 | Al crear un nuevo episodio (admisión/atención). |
| ORU^R01 | Al guardar una nota clínica. Incluye el texto de la nota y el motivo de consulta. |

**¿Qué hago si aparece la pantalla "Backend No Disponible"?**
El servidor local (backend Python) no está corriendo. Contacte al administrador o inicie el backend según las instrucciones de instalación del sistema.

**¿Los usuarios del servidor central TrakCare pueden iniciar sesión directamente?**
Sí, en el modo de despliegue en red (backend_lan). Los usuarios se sincronizan automáticamente desde el servidor central y pueden usar sus mismas credenciales sin ninguna configuración adicional.
