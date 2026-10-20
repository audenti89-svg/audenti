@echo off
title Audenti Cloud Pro - Gestor Maestro de Servicios
echo =========================================================
echo   AUDENTI CLOUD PRO - LEVANTAMIENTO INTEGRAL 100%
echo =========================================================

echo 1. Iniciando servidor OpenWA en puerto 2785...
start " OpenWA Gateway 2785\ /d \d:\Antigravity 2027\Odontologia\AppWeb CRM\audenti\OpenWA-main\OpenWA-main\ node dist/main.js

echo 2. Verificando Ollama Local...
start \Ollama Service\ ollama run llama3.2:1b

echo 3. Levantando Aplicacion Web Local...
start \Audenti Web 3000\ /d \d:\Antigravity 2027\Odontologia\AppWeb CRM\audenti\ npm run dev

echo Todo el entorno ha sido levantado correctamente.
