@echo off
setlocal

cd /d "%~dp0.."

if not exist logs mkdir logs

echo [%date% %time%] Iniciando JABESHT - BOT >> logs\startup.log
npm start >> logs\startup.log 2>&1
