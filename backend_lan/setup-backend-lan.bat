@echo off
REM ============================================================================
REM TrakCare LAN Backend v1.9.2-rc08 - Setup Script (Windows)
REM ============================================================================

echo.
echo ============================================================================
echo TrakCare LAN Backend v1.9.2-rc08 - Setup
echo ============================================================================
echo.

REM Verificar Python
echo [1/6] Verificando Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python no encontrado
    pause
    exit /b 1
)
python --version
echo       OK - Python encontrado
echo.

REM Crear entorno virtual
echo [2/6] Creando entorno virtual...
if exist "venv" (
    echo       Eliminando entorno virtual existente...
    rmdir /s /q venv
)
python -m venv venv
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] No se pudo crear el entorno virtual
    pause
    exit /b 1
)
call venv\Scripts\activate.bat
echo       OK - Entorno virtual creado y activado
echo.

REM Actualizar pip e instalar dependencias
echo [3/6] Instalando dependencias Python...
python -m pip install -q --upgrade pip
pip install -q -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron instalar las dependencias
    pause
    exit /b 1
)
echo       OK - Dependencias instaladas
echo.

REM Configurar .env
echo [4/6] Configurando variables de entorno...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo       OK - Archivo .env creado desde .env.example
        echo       IMPORTANTE: Editar .env con tus valores reales
    )
) else (
    echo       OK - Archivo .env ya existe
)
echo.

REM Verificar conexion PostgreSQL antes de migrar
echo [5/6] Verificando conexion a PostgreSQL y ejecutando migraciones...

REM Extraer host y puerto desde DATABASE_URL usando Python (maneja IPs remotas)
for /f "delims=" %%H in ('python -c "import os,re; url=open('.env').read() if os.path.exists('.env') else ''; m=re.search(r'DATABASE_URL\s*=\s*\S+://[^:]+:[^@]+@([^:/]+):?(\d*)', url); print(m.group(1) if m else 'localhost')" 2^>nul') do set PG_HOST=%%H
for /f "delims=" %%P in ('python -c "import os,re; url=open('.env').read() if os.path.exists('.env') else ''; m=re.search(r'DATABASE_URL\s*=\s*\S+://[^:]+:[^@]+@[^:/]+:(\d+)', url); print(m.group(1) if m else '5432')" 2^>nul') do set PG_PORT=%%P
if "%PG_HOST%"=="" set PG_HOST=localhost
if "%PG_PORT%"=="" set PG_PORT=5432

powershell -Command "try { $t = New-Object Net.Sockets.TcpClient; $t.Connect('%PG_HOST%', %PG_PORT%); $t.Close(); exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se puede conectar a PostgreSQL en %PG_HOST%:%PG_PORT%
    echo.
    echo  Verifica que el servidor PostgreSQL este accesible desde esta maquina.
    echo  Si el host/puerto son incorrectos, edita DATABASE_URL en .env
    echo.
    echo  Una vez que PostgreSQL este accesible, ejecuta manualmente:
    echo    venv\Scripts\activate
    echo    alembic upgrade head
    echo    python init_users.py
    echo.
    pause
    exit /b 1
)
echo       OK - PostgreSQL accesible en %PG_HOST%:%PG_PORT%

alembic upgrade head
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudieron aplicar las migraciones
    echo.
    echo  Posibles causas:
    echo  - La base de datos no existe en el servidor PostgreSQL
    echo  - Credenciales incorrectas en DATABASE_URL del archivo .env
    echo.
    pause
    exit /b 1
)
echo       OK - Migraciones aplicadas
echo.

REM Crear usuarios
echo [6/6] Creando usuarios iniciales...
python init_users.py
if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron crear los usuarios
    pause
    exit /b 1
)
echo.

echo ============================================================================
echo SETUP COMPLETADO EXITOSAMENTE!
echo ============================================================================
echo.
echo PROXIMOS PASOS:
echo.
echo 1. Activar entorno virtual:
echo    venv\Scripts\activate
echo.
echo 2. Iniciar servidor backend LAN:
echo    uvicorn app.main:app --reload --reload-exclude "frontend/*" --host 0.0.0.0 --port 8001
echo.
echo 3. API Docs: http://localhost:8001/docs
echo.
echo CREDENCIALES INICIALES:
echo    Admin: admin / admin
echo    Demo:  demo / demo
echo.
echo IMPORTANTE: Cambiar contrasenas en produccion.
echo ============================================================================
echo.
pause
