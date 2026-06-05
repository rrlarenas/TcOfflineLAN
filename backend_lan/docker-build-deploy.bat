@echo off
setlocal enabledelayedexpansion

rem =============================================================================
rem  TrakCare Backend LAN - Build y despliegue de imagen Docker
rem =============================================================================
rem  Uso:
rem    docker-build-deploy.bat                              Solo build local
rem    docker-build-deploy.bat --deploy usuario@host        Build + transferir + levantar
rem    docker-build-deploy.bat --deploy usuario@host --port 2222
rem    docker-build-deploy.bat --tag 2.5.0-rc10-stable --deploy usuario@host
rem =============================================================================

set IMAGE_NAME=trakcare-backend-lan
set IMAGE_TAG=latest
set SSH_PORT=22
set DEPLOY=false
set REMOTE_HOST=
set REMOTE_DIR=/opt/trakcare-backend-lan
set APP_ONLY=false

rem ── Parsear argumentos ────────────────────────────────────────────────────────
:parse_args
if "%~1"=="" goto args_done
if "%~1"=="--deploy" (
    set DEPLOY=true
    set REMOTE_HOST=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--port" (
    set SSH_PORT=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--tag" (
    set IMAGE_TAG=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--app-only" (
    set APP_ONLY=true
    shift
    goto parse_args
)
if "%~1"=="--help" goto show_help
if "%~1"=="-h" goto show_help
echo Argumento desconocido: %~1
exit /b 1

:show_help
echo Uso:
echo   docker-build-deploy.bat
echo   docker-build-deploy.bat --deploy usuario@host
echo   docker-build-deploy.bat --deploy usuario@host --port 2222
echo   docker-build-deploy.bat --tag 1.9.2-rc08 --deploy usuario@host
echo   docker-build-deploy.bat --app-only --deploy usuario@host   (BD externa ya corriendo)
exit /b 0

:args_done
set FULL_IMAGE=%IMAGE_NAME%:%IMAGE_TAG%
set ARCHIVE=%IMAGE_NAME%-%IMAGE_TAG%.tar

if "%APP_ONLY%"=="true" (
    set COMPOSE_FILE=docker-compose.app-only.yml
) else (
    set COMPOSE_FILE=docker-compose.yml
)

echo ==============================================
echo  TrakCare Backend LAN - Docker Build
echo  Imagen : %FULL_IMAGE%
echo  Archivo: %ARCHIVE%
if "%APP_ONLY%"=="true" echo  Modo   : solo backend ^(BD externa^)
echo ==============================================

rem ── 1. Build ──────────────────────────────────────────────────────────────────
echo.
echo [1/4] Construyendo imagen Docker...
docker build --no-cache --platform linux/amd64 -t %FULL_IMAGE% -f Dockerfile .
if %errorlevel% neq 0 (
    echo ERROR: docker build fallo.
    exit /b 1
)
echo       Imagen construida correctamente.

rem ── 2. Exportar ───────────────────────────────────────────────────────────────
echo.
echo [2/4] Exportando imagen a %ARCHIVE%...
docker save -o %ARCHIVE% %FULL_IMAGE%
if %errorlevel% neq 0 (
    echo ERROR: No se pudo exportar la imagen.
    exit /b 1
)
echo       Archivo generado: %ARCHIVE%

if "%DEPLOY%"=="false" (
    echo.
    echo Build completado. Archivo listo: %ARCHIVE%
    echo.
    echo Para cargar manualmente en el servidor:
    echo   scp -P %SSH_PORT% %ARCHIVE% usuario@servidor:%REMOTE_DIR%/
    echo   scp -P %SSH_PORT% %COMPOSE_FILE% usuario@servidor:%REMOTE_DIR%/
    echo   ssh -p %SSH_PORT% usuario@servidor "cd %REMOTE_DIR% ^&^& docker load -i %ARCHIVE% ^&^& docker compose -f %COMPOSE_FILE% up -d"
    exit /b 0
)

rem ── 3. Transferir al servidor ─────────────────────────────────────────────────
echo.
echo [3/4] Transfiriendo imagen a %REMOTE_HOST%...
ssh -p %SSH_PORT% -o StrictHostKeyChecking=no %REMOTE_HOST% "mkdir -p %REMOTE_DIR%"
if %errorlevel% neq 0 (
    echo ERROR: No se pudo conectar al servidor %REMOTE_HOST%.
    exit /b 1
)

scp -P %SSH_PORT% %ARCHIVE% %REMOTE_HOST%:%REMOTE_DIR%/
if %errorlevel% neq 0 ( echo ERROR: Fallo al transferir %ARCHIVE%. & exit /b 1 )

scp -P %SSH_PORT% %COMPOSE_FILE% %REMOTE_HOST%:%REMOTE_DIR%/
if %errorlevel% neq 0 ( echo ERROR: Fallo al transferir %COMPOSE_FILE%. & exit /b 1 )

if exist ".env" (
    scp -P %SSH_PORT% .env %REMOTE_HOST%:%REMOTE_DIR%/
    echo       .env transferido.
) else (
    echo       AVISO: no se encontro .env local. Asegurese de que exista en %REMOTE_DIR%/.env en el servidor.
)

rem ── 4. Cargar y levantar en el servidor ───────────────────────────────────────
echo.
echo [4/4] Cargando imagen y levantando servicio en %REMOTE_HOST%...
ssh -p %SSH_PORT% -o StrictHostKeyChecking=no %REMOTE_HOST% "cd %REMOTE_DIR% && docker load -i %ARCHIVE% && docker compose -f %COMPOSE_FILE% down --remove-orphans 2>/dev/null; docker compose -f %COMPOSE_FILE% up -d && docker compose -f %COMPOSE_FILE% ps"
if %errorlevel% neq 0 (
    echo ERROR: Fallo al levantar los servicios en el servidor.
    exit /b 1
)

echo.
echo ==============================================
echo  Despliegue completado.
echo  API : http://%REMOTE_HOST%:8000
echo  Docs: http://%REMOTE_HOST%:8000/docs
echo ==============================================

endlocal
