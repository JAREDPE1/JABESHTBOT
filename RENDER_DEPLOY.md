# Despliegue en Render

## Archivos importantes

- `Dockerfile`: crea una imagen Linux con Node.js, `ffmpeg` y `yt-dlp`.
- `render.yaml`: blueprint para Render con Docker, health check y disco persistente.
- `index.js`: detecta Windows/Linux y usa `YT_DLP_PATH`, `FFMPEG_PATH`, `DATA_DIR` y `AUTH_DIR`.

## Variables de entorno

Render queda configurado por `render.yaml` con:

- `DATA_DIR=/data`
- `AUTH_DIR=/data/auth`
- `TMP_DIR=/tmp/jabesht-bot`
- `YT_DLP_PATH=/usr/local/bin/yt-dlp`
- `FFMPEG_PATH=/usr/bin/ffmpeg`
- `TZ=America/Lima`

## Sesion de WhatsApp

Baileys guarda la sesion con `useMultiFileAuthState(AUTH_DIR)`.

En Render, el filesystem normal es efimero: al reiniciar, redeployar o mover instancia, puedes perder la carpeta `auth`.
Por eso el `render.yaml` monta un disco persistente en `/data`. La sesion queda en `/data/auth`.

Render Free no es ideal para este bot porque:

- Puede dormir por inactividad y cortar la conexion WebSocket de WhatsApp.
- No es buena opcion para procesos 24/7.
- Sin disco persistente, tendras que escanear QR otra vez cuando se pierda `auth`.

Para produccion usa un plan con Persistent Disk o mueve la sesion a almacenamiento externo.

## Pasos para desplegar

1. Sube el repo a GitHub sin `node_modules`, `auth`, `.exe`, `bot-config.json` ni `tiktok-state.json`.
2. En Render, crea un nuevo Blueprint desde el repo.
3. Render leera `render.yaml`.
4. Usa Docker runtime.
5. Espera el build.
6. En los logs aparecera el QR de WhatsApp si no existe sesion.
7. Escanea el QR.
8. Configura tus grupos desde WhatsApp:
   - `!activarkick`
   - `!activartiktok @usuario`

## Desarrollo local en Windows

Puedes seguir usando:

```bash
npm install
npm run dev
```

Si tienes `yt-dlp.exe` y `ffmpeg.exe` en la carpeta, el bot los usa automaticamente en Windows.
Si prefieres rutas personalizadas:

```bash
set YT_DLP_PATH=C:\ruta\yt-dlp.exe
set FFMPEG_PATH=C:\ruta\ffmpeg.exe
npm run dev
```
