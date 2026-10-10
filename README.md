# JABESHT - BOT

Bot de WhatsApp hecho con Node.js y Baileys.

## Funciones

- Descargar audio/video desde YouTube.
- Descargar videos por enlace desde TikTok y Facebook usando `yt-dlp`.
- Crear stickers con imagenes o videos cortos.
- Ver ping y estado del bot.
- Consultar DNI usando una API autorizada configurada por entorno.
- Responder preguntas con IA y generar trabajos academicos en texto y Word.
- Avisar cuando `anflo1` prende stream en Kick.
- Monitorear TikTok y avisar cuando una cuenta publica sube video nuevo.
- Monitorear canales públicos de YouTube y avisar cuando publican videos.
- Monitorear videos y reels de perfiles públicos de Instagram con Instaloader.
- Adjuntar miniaturas a los avisos cuando la plataforma las ofrece.
- Mostrar el tiempo conectado en `!estado` y actualizar la info del perfil cada minuto.
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
sudo apt install -y python3 python3-venv
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
git clone URL_DE_TU_REPOSITORIO
cd NOMBRE_DEL_REPOSITORIO
npm install
python3 -m venv .venv
.venv/bin/pip install -r requirements-instagram.txt
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
- `DNI_API_URL`: URL de una API autorizada para consultar DNI. Por defecto se usa `https://api.verificape.com/v2/dni/{dni}`.
- `DNI_API_TOKEN`: API key de VerificaPE para usar `!dni`.
- `AI_PROVIDER`: proveedor para comandos de IA. Usa `gemini` u `openai`.
- `GEMINI_API_KEY`: API key de Gemini para usar IA con Google AI Studio.
- `GEMINI_MODEL`: modelo de Gemini. Por defecto `gemini-3.1-flash-lite`.
- `GEMINI_TIMEOUT_MS`: tiempo maximo de espera para Gemini.
- `OPENAI_API_KEY`: API key de OpenAI si usas `AI_PROVIDER=openai`.
- `OPENAI_MODEL`: modelo de OpenAI. Por defecto `gpt-4.1-mini`.
- `OPENAI_TIMEOUT_MS`: tiempo maximo de espera para OpenAI.
- `IA_MAX_TOKENS`: limite de salida para `!ia`.
- `DOC_MAX_TOKENS`: limite de salida para documentos academicos.
- `INSTAGRAM_PYTHON`: ruta opcional a Python con Instaloader instalado. Por defecto se usa `.venv/bin/python` si existe.
- `INSTAGRAM_SESSION_USER` y `INSTAGRAM_SESSION_FILE`: sesion opcional de Instaloader cuando Instagram limita el acceso anonimo.
- `INSTAGRAM_MODE=graph`, `INSTAGRAM_USER_ID` y `INSTAGRAM_ACCESS_TOKEN`: alternativa opcional para una cuenta profesional propia con Graph API.

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
- `!video <URL>`
- `!fb <URL>`
- `!facebook <URL>`
- `!tiktok <URL>`
- `!tt <URL>`
- `!play <nombre>`
- `!lista <nombre>`
- `!ia <pregunta>`
- `!monografia <tema>`
- `!monografia-pptx <tema>`
- `!ensayo <tema>`
- `!ensayo-pptx <tema>`
- `!resumen <tema>`
- `!resumen-pptx <tema>`
- `!exposicion <tema>`
- `!exposicion-pptx <tema>`
- `!introduccion <tema>`
- `!introduccion-pptx <tema>`
- `!conclusion <tema>`
- `!conclusion-pptx <tema>`
- `!objetivos <tema>`
- `!objetivos-pptx <tema>`
- `!s`
- `!dni <numero>`
- `!ping`
- `!estado`
- `!activarkick`
- `!verkick`
- `!activartiktok @usuario`
- `!vertiktok`
- `!activaryoutube @canal` o `!activaryoutube URL_DEL_CANAL`
- `!veryoutube`
- `!activarinstagram @usuario`
- `!verinstagram`
- `.creador`

## Primer Uso

1. Ejecuta `npm start`.
2. Escanea el QR.
3. En el grupo donde quieres avisos de Kick escribe:
   `!activarkick`
4. En el grupo donde quieres avisos de TikTok escribe:
   `!activartiktok @usuario`
5. Para YouTube usa `!activaryoutube @canal` en el grupo.
6. Para Instagram instala Instaloader con los comandos anteriores. Después usa `!activarinstagram @usuario` en el grupo; la cuenta debe ser pública para consultarla sin iniciar sesión.

Si Instagram responde `429` o pide inicio de sesion, crea una sesion de Instaloader en el mismo usuario de Linux que ejecuta el bot:

```bash
.venv/bin/instaloader --login TU_USUARIO_DE_INSTAGRAM
```

Después agrega `INSTAGRAM_SESSION_USER=TU_USUARIO_DE_INSTAGRAM` a `.env` y reinicia el bot. La sesion se guarda por defecto en `~/.config/instaloader/`; conserva ese archivo privado. No pongas la contraseña en `.env` ni en el repositorio.

Para actualizar una instalacion existente en Linux Mint:

```bash
git pull origin main
sudo apt install -y python3-venv
python3 -m venv .venv
.venv/bin/pip install -r requirements-instagram.txt
npm ci
pm2 restart jabesht-bot
```

El primer video se guarda como referencia, sin mandar un aviso viejo. Los nuevos se revisan cada 5 minutos; Kick se revisa cada minuto. Si falla la miniatura, se envía el aviso en texto. Instagram puede limitar el acceso anónimo; en ese caso el bot no avanza el estado y vuelve a intentar en la siguiente revisión.

La info de WhatsApp es texto estático entre actualizaciones. El bot la renueva cada minuto para evitar actualizar el perfil cada segundo. El comando `!estado` calcula días, horas, minutos y segundos al pedirlo.

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
