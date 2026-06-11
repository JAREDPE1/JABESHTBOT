# 🤖 Bot WhatsApp Descargador de Música

Bot de WhatsApp desarrollado con Baileys que permite descargar música de YouTube y enviarla directamente por WhatsApp.

## 📋 Requisitos

Antes de instalar el bot, asegúrate de tener:

- Node.js 18 o superior
- npm
- ffmpeg
- yt-dlp
- Una cuenta de WhatsApp

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Instalar FFmpeg

#### Windows

Descarga FFmpeg y coloca `ffmpeg.exe` en la carpeta principal del proyecto.

#### Linux

```bash
sudo apt update
sudo apt install ffmpeg
```

#### Termux

```bash
pkg update
pkg install ffmpeg
```

### 4. Instalar yt-dlp

#### Windows

Descarga `yt-dlp.exe` y colócalo en la carpeta principal del proyecto.

#### Linux

```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

#### Termux

```bash
pkg install python
pip install -U yt-dlp
```

## ▶️ Iniciar el bot

```bash
node index.js
```

La primera vez aparecerá un código QR o un código de vinculación.

Abre WhatsApp en tu teléfono:

1. Configuración
2. Dispositivos vinculados
3. Vincular dispositivo
4. Escanea el QR o ingresa el código

## 📁 Estructura del proyecto

```text
.
├── index.js
├── package.json
├── auth/
├── tmp/
├── ffmpeg.exe
├── yt-dlp.exe
└── node_modules/
```

## ⚠️ Importante

Si compartes el proyecto:

- NO subas la carpeta `auth/`
- NO subas la carpeta `node_modules/`
- NO compartas tus credenciales o sesiones de WhatsApp

Antes de usar el bot por primera vez, elimina la carpeta:

```text
auth/
```

para generar una nueva sesión de WhatsApp.

## 🔧 Actualizar dependencias

```bash
npm update
```

## 🛑 Detener el bot

Presiona:

```bash
CTRL + C
```

## 📜 Licencia

Proyecto de uso educativo. El usuario es responsable del uso que haga del bot y del cumplimiento de los términos de servicio de WhatsApp y YouTube.