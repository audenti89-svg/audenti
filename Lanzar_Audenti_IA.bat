@echo off
TITLE Lanzador de Oficina IA - Audenti CRM
COLOR 0B

echo ======================================================
echo        SISTEMA DE ARRANQUE AUTOMATICO Audenti
echo ======================================================
echo.

:: 1. Iniciar Ollama
echo [1/4] Iniciando Ollama (Analista Local)...
start "" "ollama serve"
timeout /t 5 /nobreak > nul
echo OK: Ollama en ejecucion.
echo.

:: 2. Iniciar 9Router
echo [2/4] Iniciando 9Router (Puente de IAs Gratis)...
:: Ajusta la ruta si 9router es un ejecutable diferente o un comando de npm
start "" cmd /k "npm run start:9router"
timeout /t 5 /nobreak > nul
echo OK: 9Router activado.
echo.

:: 3. Levantar Tunel de Conectividad (Cloudflare Tunnel)
echo [3/4] Estableciendo Tunel de Conexion Cloudflare...
:: Usamos cloudflared para exponer el puerto de Ollama/9Router al mundo
start "" cloudflared tunnel --url http://localhost:11434
timeout /t 5 /nobreak > nul
echo OK: Tunel activo. (Verifica la URL en la ventana de Cloudflare)
echo.

:: 4. Lanzar Audenti CRM
echo [4/4] Lanzando Dashboard de Audenti...
start http://localhost:3000
echo.

echo ======================================================
echo    SISTEMA LISTO: Oficina de IAs en linea.
echo    Recuerda copiar la URL del tunel en tu .env de Vercel.
echo ======================================================
pause
