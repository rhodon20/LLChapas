@echo off
setlocal
title La Liga RPG Chapas - Launcher

echo ========================================================
echo      LA LIGA RPG CHAPAS - INSTALADOR Y LANZADOR
echo ========================================================
echo.

REM 1. Comprobar si Node.js esta instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no ha sido detectado en tu sistema.
    echo.
    echo Este juego requiere Node.js para funcionar.
    echo Se abrira la web de descarga automaticamente.
    echo Por favor, instalalo y vuelve a ejecutar este archivo.
    echo.
    timeout /t 5
    start https://nodejs.org/
    pause
    exit /b
)

echo [OK] Node.js detectado.
echo.

REM 2. Comprobar e instalar dependencias
if not exist "node_modules" (
    echo [INFO] Primera vez detectada. Instalando dependencias...
    echo Esto puede tardar unos minutos...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Ha ocurrido un error instalando las dependencias.
        pause
        exit /b
    )
    echo.
    echo [OK] Instalacion completada.
) else (
    echo [INFO] Dependencias ya instaladas.
)

REM 3. Arrancar el juego
echo.
echo ========================================================
echo      INICIANDO EL JUEGO...
echo ========================================================
echo.
echo El navegador se abrira automaticamente.
echo Cierra esta ventana negra cuando termines de jugar.
echo.

call npm run dev

pause