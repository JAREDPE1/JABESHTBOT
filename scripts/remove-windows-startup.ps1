$ErrorActionPreference = "Stop"

$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "JABESHT BOT.cmd"

if (!(Test-Path $shortcutPath)) {
    Write-Host "No existe inicio automatico instalado para JABESHT - BOT."
    exit 0
}

Remove-Item -LiteralPath $shortcutPath -Force
Write-Host "Listo. Se quito el inicio automatico de JABESHT - BOT."
