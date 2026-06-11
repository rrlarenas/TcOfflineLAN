# Procedimiento de Instalación de Certificados SSL/TLS y Configuración de Nombres DNS para HealthConnect

## 1. Objetivo

Este documento describe el procedimiento para la instalación de certificados SSL/TLS en servidores Apache HTTP Server utilizados por la plataforma HealthConnect, así como las recomendaciones de nomenclatura DNS para ambientes de pruebas (TEST) y producción (LIVE).

---

# 2. Alcance

Este procedimiento aplica a:

* Servidores Apache que actúan como Web Gateway de HealthConnect.
* Ambientes TEST y LIVE.
* Configuraciones HTTPS utilizadas para acceso seguro a servicios InterSystems HealthConnect.

---

# 3. Prerrequisitos

Antes de iniciar la instalación, se debe contar con:

* Certificado del servidor emitido por una entidad certificadora válida.
* Certificados intermedios y raíz (CA).
* Llave privada asociada al certificado (`.key`).
* Acceso administrativo al sistema operativo Linux.
* Permisos para modificar la configuración de Apache HTTP Server.

---

# 4. Instalación de Certificados

## 4.1 Copia de certificados

Copiar el certificado del servidor junto con los certificados intermedios y raíz a las siguientes ubicaciones:

```bash
/etc/pki/tls/certs/server.crt
/etc/pki/tls/certs/rootCA.crt
```

Ejemplo:

```bash
cp certificado_servidor.crt /etc/pki/tls/certs/server.crt
cp cadena_ca.crt /etc/pki/tls/certs/rootCA.crt
```

---

## 4.2 Copia de la llave privada

Copiar la llave privada asociada al certificado en:

```bash
/etc/pki/tls/private/server.key
```

Ejemplo:

```bash
cp certificado.key /etc/pki/tls/private/server.key
```

Se recomienda restringir los permisos del archivo:

```bash
chmod 600 /etc/pki/tls/private/server.key
chown root:root /etc/pki/tls/private/server.key
```

---

## 4.3 Configuración de Apache

Editar el archivo:

```bash
/etc/httpd/conf.d/ssl.conf
```

Verificar o modificar las siguientes directivas:

```apache
SSLCertificateFile /etc/pki/tls/certs/server.crt
SSLCertificateChainFile /etc/pki/tls/certs/rootCA.crt
SSLCertificateKeyFile /etc/pki/tls/private/server.key
```

Validar que las rutas coincidan con los archivos instalados.

---

## 4.4 Validación de Configuración

Antes de recargar Apache, validar la sintaxis:

```bash
httpd -t
```

Resultado esperado:

```text
Syntax OK
```

Si se detectan errores, corregirlos antes de continuar.

---

## 4.5 Recarga del Servicio Apache

Aplicar la nueva configuración ejecutando:

```bash
systemctl reload httpd
```

Verificar el estado del servicio:

```bash
systemctl status httpd
```

---

## 4.6 Verificación HTTPS

Comprobar desde un navegador web o utilizando OpenSSL:

```bash
openssl s_client -connect <hostname>:443
```

Verificar que:

* El certificado corresponda al nombre DNS configurado.
* La cadena de certificación sea válida.
* No existan advertencias de confianza.

---

# 5. Convención de Nombres DNS

Se recomienda separar claramente los nombres de:

* Servidores físicos o virtuales.
* Balanceadores de carga.
* Web Gateways.
* Direcciones VIP.

Esta práctica facilita la administración, monitoreo y resolución de incidentes.

---

## 5.1 Ambiente TEST

| Nombre DNS                       | Apunta a                    | Propósito                     |
| -------------------------------- | --------------------------- | ----------------------------- |
| hctest01.angloamericana.com.pe   | Servidor HealthConnect TEST | Acceso directo al servidor HC |
| hctest.angloamericana.com.pe     | Load Balancer               | Acceso externo al servicio HC |
| hcgwtest01.angloamericana.com.pe | HC Web Gateway TEST         | Acceso HTTPS al servicio HC   |

---

## 5.2 Ambiente LIVE

| Nombre DNS                       | Apunta a              | Propósito                       |
| -------------------------------- | --------------------- | ------------------------------- |
| hclive01.angloamericana.com.pe   | HC Nodo 1 LIVE        | Acceso directo al servidor 1 HC |
| hclive02.angloamericana.com.pe   | HC Nodo 2 LIVE        | Acceso directo al servidor 2 HC |
| hclive00.angloamericana.com.pe   | HC VIP LIVE           | Acceso directo a VIP de HC      |
| hclive.angloamericana.com.pe     | Load Balancer         | Acceso externo al servicio HC   |
| hcgwlive01.angloamericana.com.pe | HC Web Gateway 1 LIVE | Acceso HTTPS al servicio HC     |
| hcgwlive02.angloamericana.com.pe | HC Web Gateway 2 LIVE | Acceso HTTPS al servicio HC     |

---

# 6. Recomendaciones

* Utilizar certificados emitidos por una entidad certificadora corporativa o pública autorizada.
* Mantener respaldos de certificados y llaves privadas en ubicaciones seguras.
* Monitorear periódicamente las fechas de expiración de los certificados.
* Implementar pruebas de conectividad HTTPS posteriores a cualquier cambio.
* Utilizar los nombres DNS de servicio (Load Balancer) para accesos de usuarios y aplicaciones externas.
* Reservar los nombres de nodos individuales para administración, soporte y diagnóstico.

---

# 7. Referencias

* Apache HTTP Server SSL/TLS Configuration.
* InterSystems HealthConnect Deployment Guide.
* Políticas corporativas de certificados digitales y gestión DNS.
