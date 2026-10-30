# JABESHT - BOT

Bot de WhatsApp hecho con Node.js y Baileys.

## Menú interactivo por categorías

El comando `!menu` (también `!ayuda`) muestra un botón **📚 Ver comandos**. Al tocarlo se abre una lista con secciones: Música y videos, Inteligencia artificial, Word y PowerPoint, Herramientas, Grupos y miembros, Avisos de redes e Información. El creador autorizado puede ver además Administración, con `!gru`, `!actualizar`, `!reiniciar` y `!estadoactualizacion`. El botón **📚 Otras secciones** vuelve al listado.

Los comandos siguen siendo mensajes de texto escritos por el usuario; seleccionar una sección únicamente muestra su explicación, nunca ejecuta operaciones administrativas. La compatibilidad con botones depende del cliente de WhatsApp y Baileys; si no aparecen, escribe `!menutexto` y responde con el número de la categoría. Responde `0` para volver después de consultar una sección. El menú expira después de tres minutos y se puede reabrir con `!menu`.

## Funciones

- Descargar audio/video desde YouTube.
- Descargar videos por enlace desde TikTok y Facebook usando `yt-dlp`.
- Crear stickers con imagenes o videos cortos.
- Ver ping y estado del bot.
- Consultar DNI usando una API autorizada configurada por entorno.
- Responder preguntas con IA y generar trabajos academicos en texto y Word.
- Avisar cuando `anflo1` prende stream en Kick.
- Monitorear TikTok y avisar cuando una cuenta publica sube video nuevo.
- Monitorear el feed de canales públicos de YouTube y avisar de videos y Shorts nuevos, con miniatura.
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

## Comando privado del creador

- `!gru`: muestra únicamente al propietario cuántos grupos de WhatsApp tiene actualmente la cuenta vinculada al bot. Se usa en el chat privado con el bot. Muestra el total y una lista numerada con los nombres de los grupos; no muestra sus identificadores ni participantes. El número permitido se define mediante `BOT_OWNER_NUMBER` (por defecto `51957211832`). Si WhatsApp entrega solo un LID sin mapeo verificable al número, el bot rechaza la consulta por seguridad.

## Administración remota desde WhatsApp (Linux Mint + PM2)

Los comandos `!actualizar`, `!reiniciar` y `!estadoactualizacion` son **solo para el creador**, desde chat privado, mediante la misma verificación de identidad que `!gru`. Están **apagados por defecto**. Para habilitarlos, añade `BOT_REMOTE_ADMIN_ENABLED=true` en el `.env` privado del servidor y reinicia una vez PM2. Asegúrate de que `BOT_OWNER_NUMBER` contenga el número del creador con prefijo de país, que el proceso se ejecute con PM2 y que el repositorio local tenga `origin` apuntando a `JAREDPE1/JABESHTBOT`.

- `!actualizar`: un proceso independiente verifica `main`, comprueba que no existan modificaciones locales rastreadas, ejecuta `git fetch origin main`, exige una actualización fast-forward, instala dependencias de Node sin scripts, verifica la sintaxis y reinicia únicamente el proceso PM2 del bot.
- `!reiniciar`: reinicia únicamente el proceso actual de PM2, sin tocar archivos.
- `!estadoactualizacion`: muestra el último estado o error guardado en `remote-maintenance-status.json`, sin exponer credenciales ni contraseñas.

Después de un reinicio puede haber un breve intervalo sin respuesta. Si una actualización falla antes de reiniciar, el estado queda como error para consulta. Si falla luego de modificar archivos, puede requerirse recuperar el bot desde Linux Mint. Usa pruebas antes de fusionar código en `main`. No ejecutes el bot como root. El proceso independiente debe tener permisos para utilizar Git, npm y pm2.

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
- `!desactivarkick`
- `!verkick`
- `!activartiktok @usuario`
- `!desactivartiktok @usuario`
- `!vertiktok`
- `!activaryoutube @canal` o `!activaryoutube URL_DEL_CANAL`
- `!desactivaryoutube @canal`
- `!veryoutube`
- `!activarinstagram @usuario`
- `!desactivarinstagram @usuario`
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

YouTube guarda el ID del canal y consulta su feed cada 5 minutos, sin descargar videos para buscar novedades. Si aparecen varias publicaciones entre revisiones, avisa de cada una y conserva los envíos exitosos al reiniciar. La primera activación solo establece la referencia. El feed contiene las publicaciones recientes que YouTube expone; un apagado prolongado puede dejar publicaciones fuera de esa ventana. Referencia: [feeds de YouTube](https://developers.google.com/youtube/v3/guides/push_notifications).

Los videos descargados con `!play` se convierten con FFmpeg a MP4 con video H.264, audio AAC y formato de color yuv420p antes de enviarlos. La conversión puede tardar según la duración y el equipo. Se aplica [faststart](https://www.ffmpeg.org/ffmpeg-formats.html) para colocar el índice al comienzo del archivo. Si la conversión falla, el bot informa el error en lugar de enviar el archivo defectuoso.

El primer video se guarda como referencia, sin mandar un aviso viejo. Los nuevos se revisan cada 5 minutos; Kick se revisa cada minuto. Si falla la miniatura, se envía el aviso en texto. Instagram puede limitar el acceso anónimo; en ese caso el bot no avanza el estado y vuelve a intentar en la siguiente revisión.

Para detener avisos, escribe el comando `!desactivar...` correspondiente en el mismo grupo donde los activaste. Puedes omitir `@usuario` o `@canal`; si lo incluyes, el bot comprueba que coincida con la cuenta configurada.

La sección Info. del perfil muestra el tiempo conectado y el bot la renueva cada minuto. Al detenerse normalmente intenta borrarla. WhatsApp puede tardar en reflejar los cambios; si se corta la luz o la red, el bot no puede borrar la Info. hasta volver a conectarse. El comando `!estado` calcula días, horas, minutos y segundos al pedirlo.

## Guardar canciones MP3 en Android y iPhone

Con `!play <nombre>` o `!yt <URL>`, el bot ofrece la elección de audio MP3 o video MP4 mediante botones en WhatsApp. Es la misma interfaz para WhatsApp Android y WhatsApp iPhone; la presentación de los botones puede variar según la aplicación. Si no aparecen, responde `1` para MP3 o `2` para MP4.

Al elegir MP3, el bot envía un audio reproducible y, si `MUSIC_SEND_DOCUMENT=true` (predeterminado), también un archivo descargable `.mp3` con el nombre de la canción. El envío duplicado consume más datos móviles. Si falta FFmpeg, podría enviarse un formato de audio diferente al MP3.

- **Android:** descarga el documento adjunto de WhatsApp. Abre tu administrador de archivos, encuentra el MP3 en los documentos recibidos de WhatsApp y usa **Mover** o **Copiar** a la carpeta `Music` del almacenamiento interno.
- **iPhone:** abre el documento MP3 en el chat, usa **Compartir** (o las opciones del documento), selecciona **Guardar en Archivos** y elige **En mi iPhone** o **iCloud Drive**. Si no aparece `En mi iPhone`, guarda en iCloud Drive o en una ubicación disponible. Abre la app **Archivos** para escucharlo con una aplicación compatible.
- **Apple Music:** guardar un MP3 en Archivos **no** lo incorpora automáticamente a la biblioteca de Apple Music. Para añadirlo a esa biblioteca se requiere una importación/sincronización aparte desde Mac o PC, cuando corresponda.

Ningún bot de WhatsApp puede obligar al teléfono del receptor a guardar archivos directamente en `Music`, `Fotos` o la biblioteca de Apple Music. El usuario decide dónde se guardan en su dispositivo.

Para desactivar el archivo adicional (enviar solo el audio reproducible), configura `MUSIC_SEND_DOCUMENT=false` en tu `.env`.

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
pm2 start index.js --name jabesht-bot --kill-timeout 10000
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

Si ya habías creado el proceso sin `--kill-timeout`, configúralo una vez con `pm2 delete jabesht-bot`, luego `pm2 start index.js --name jabesht-bot --kill-timeout 10000` y `pm2 save`. Así PM2 da tiempo a borrar la Info. antes de forzar el cierre.

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
