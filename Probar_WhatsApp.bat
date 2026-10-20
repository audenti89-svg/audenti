@echo off
TITLE Prueba de Envio WhatsApp
echo ========================================================
echo    ENVIANDO MENSAJE DE PRUEBA A la CLINICA AUDENTI...
echo ========================================================
echo.

curl -X POST "http://localhost:2785/api/sessions/audenti_default/messages/send" -H "Content-Type: application/json" -d "{\"chatId\":\"525543128719@c.us\",\"text\":\"SISTEMA ACTIVO: Hola Aura, el sistema nervioso ya responde desde el lanzador automatico\"}"

echo.
echo ========================================================
echo    PROCESO TERMINADO
echo ========================================================
echo.
echo Revisa tu celular para ver si llego el mensaje.
pause
