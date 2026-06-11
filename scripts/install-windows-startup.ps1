$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
$batPath = Join-Path $PSScriptRoot "start-windows.bat"
$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "JABESHT BOT.cmd"

if (!(Test-Path $batPath)) {
    throw "No se encontro: $batPath"
}

$content = @"
@echo off
start "JABESHT BOT" /min "$batPath"
"@

Set-Content -Path $shortcutPath -Value $content -Encoding ASCII

Write-Host "Listo. JABESHT - BOT se iniciara automaticamente cuando inicies sesion en Windows."
Write-Host "Archivo creado: $shortcutPath"
Write-Host "Logs: $projectDir\logs\startup.log"
