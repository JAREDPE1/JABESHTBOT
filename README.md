# JABESHT - BOT

Bot de WhatsApp hecho con Node.js y Baileys.

## Funciones

- Descargar audio/video desde YouTube.
- Avisar cuando `anflo1` prende stream en Kick.
- Monitorear TikTok y avisar cuando una cuenta publica sube video nuevo.
- Mostrar creditos con `.creador`.

## Requisitos

- Node.js 20 recomendado.
- npm.
- ffmpeg.
- yt-dlp.
- Git.
- Una cuenta de WhatsApp para vincular el bot.

## Instalacion Rapida En Linux/VPS

```bash
sudo apt update
sudo apt install -y git curl ffmpeg nodejs npm
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
git clone URL_DE_TU_REPOSITORIO
cd NOMBRE_DEL_REPOSITORIO
npm install
npm start
```

Cuando salga el QR en la consola, escanealo desde WhatsApp:

WhatsApp -> Dispositivos vinculados -> Vincular dispositivo.

## Instalacion En Termux Android

Primero instala Termux desde F-Droid, no desde Play Store.

```bash
pkg update -y
pkg upgrade -y
pkg install -y git nodejs ffmpeg python
pip install -U yt-dlp
git clone https://github.com/JAREDPE1/JABESHTBOT.git
cd JABESHTBOT
npm install
YT_DLP_PATH=yt-dlp FFMPEG_PATH=ffmpeg npm start
```

Para mantenerlo activo en Termux:

```bash
termux-wake-lock
```

Si cierras Termux o Android mata el proceso, el bot se apaga. Para uso serio conviene un VPS.

## Instalacion En Windows

1. Instala Node.js 20.
2. Instala Git.
3. Descarga `yt-dlp.exe`.
4. Descarga `ffmpeg.exe`.
5. Coloca `yt-dlp.exe` y `ffmpeg.exe` en la carpeta del bot, o define sus rutas.

```bat
git clone https://github.com/JAREDPE1/JABESHTBOT.git
cd JABESHTBOT
npm install
npm start
```

Con rutas personalizadas:

```bat
set YT_DLP_PATH=C:\ruta\yt-dlp.exe
set FFMPEG_PATH=C:\ruta\ffmpeg.exe
npm start
```

## Iniciar Automaticamente Al Prender Windows

Para que el bot se inicie solo cuando prendas tu PC e inicies sesion:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows-startup.ps1
```

Para quitar el inicio automatico:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\remove-windows-startup.ps1
```

Los logs del arranque automatico quedan en:

```text
logs\startup.log
```

## Instalacion Con Docker

```bash
git clone https://github.com/JAREDPE1/JABESHTBOT.git
cd JABESHTBOT
docker build -t jabesht-bot .
docker run -it --name jabesht-bot -p 3000:3000 -e PORT=3000 -v jabesht-data:/data jabesht-bot
```

## Variables De Entorno

Opcionales:

- `DATA_DIR`: carpeta donde se guardan configuracion y estado.
- `AUTH_DIR`: carpeta donde se guarda la sesion de WhatsApp.
- `TMP_DIR`: carpeta temporal.
- `YT_DLP_PATH`: ruta/comando de yt-dlp.
- `FFMPEG_PATH`: ruta/comando de ffmpeg.
- `PORT`: puerto para `/health` en servidores tipo Render.

Puedes copiar `.env.example` a `.env` y editarlo:

```bash
cp .env.example .env
```

Ejemplo Linux:

```bash
export DATA_DIR=/home/usuario/jabesht-data
export AUTH_DIR=/home/usuario/jabesht-data/sesion
export YT_DLP_PATH=/usr/local/bin/yt-dlp
export FFMPEG_PATH=/usr/bin/ffmpeg
npm start
```

## Comandos Del Bot

- `!menu`
- `!yt <URL>`
- `!play <nombre>`
- `!lista <nombre>`
- `!activarkick`
- `!verkick`
- `!activartiktok @usuario`
- `!vertiktok`
- `.creador`

## Primer Uso

1. Ejecuta `npm start`.
2. Escanea el QR.
3. En el grupo donde quieres avisos de Kick escribe:
   `!activarkick`
4. En el grupo donde quieres avisos de TikTok escribe:
   `!activartiktok @usuario`

## Sesion De WhatsApp

La sesion se guarda en `AUTH_DIR`.

Por defecto local:

```text
./sesion
```

No borres esa carpeta si no quieres escanear QR otra vez.


## Mantenerlo Encendido En Un VPS

Instala PM2:

```bash
sudo npm install -g pm2
pm2 start index.js --name jabesht-bot
pm2 save
pm2 startup
```

Ver logs:

```bash
pm2 logs jabesht-bot
```

Reiniciar:

```bash
pm2 restart jabesht-bot
```

## Problemas Comunes

Si sale error de `yt-dlp`:

```bash
yt-dlp --version
```

Si sale error de `ffmpeg`:

```bash
ffmpeg -version
```

Si el bot pide QR otra vez, revisa que `AUTH_DIR` no se haya borrado.

Si WhatsApp se desconecta mucho, usa un VPS estable y no un servicio que duerme por inactividad.
