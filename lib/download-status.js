"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

// El MP4 corto se reproduce como GIF en WhatsApp (gifPlayback).
// Es la animación compartida por el creador del bot.
const ANIMACION_DESCARGA = path.join(__dirname, "..", "assets", "download-animation.mp4");

async function reaccionar(sock, jid, key, emoji) {
    if (!key) return;
    try {
        await sock.sendMessage(jid, { react: { text: emoji, key } });
    } catch (error) {
        console.warn("Reacción de descarga no disponible:", error.message);
    }
}

// Al pulsar una opción reaccionamos al mensaje de elección y enseñamos
// un GIF mientras yt-dlp/ffmpeg preparan el archivo. Todo es no bloqueante
// para la descarga si WhatsApp rechaza la animación.
async function generarAnimacionFallback(ffmpegPath = "ffmpeg") {
    const destino = path.join(os.tmpdir(), "jabesht-progress-" + process.pid + ".mp4");
    if (fs.existsSync(destino)) return destino;
    await new Promise((resolve, reject) => {
        const args = [
            "-y", "-f", "lavfi", "-i", "color=c=0x12262d:s=320x160:r=12:d=2",
            "-vf", "drawtext=text='JABESHTBOT':fontcolor=white:fontsize=27:x=(w-text_w)/2:y=(h-text_h)/2-15,drawtext=text='Preparando...':fontcolor=0x40df98:fontsize=21:x=(w-text_w)/2+12*sin(2*PI*t):y=(h-text_h)/2+30",
            "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", destino
        ];
        const p = spawn(ffmpegPath, args, { windowsHide: true });
        let error = "";
        p.stderr.on("data", d => { error += d.toString().slice(-1000); });
        p.on("error", reject);
        p.on("close", code => code === 0 ? resolve() : reject(new Error(error.slice(-500) || "ffmpeg falló")));
    });
    return destino;
}

async function iniciarIndicadorDescarga(sock, jid, key, tipo, { archivoAnimacion = ANIMACION_DESCARGA, ffmpegPath = "ffmpeg" } = {}) {
    await reaccionar(sock, jid, key, "🕒");
    const etiqueta = tipo === "mp4" ? "🎬 Preparando video..." : "🎵 Preparando audio...";
    let mensajeIndicador = null;

    if (!fs.existsSync(archivoAnimacion)) {
        try { archivoAnimacion = await generarAnimacionFallback(ffmpegPath); }
        catch (error) { console.warn("No se pudo crear animación:", error.message); }
    }

    if (fs.existsSync(archivoAnimacion)) {
        try {
            mensajeIndicador = await sock.sendMessage(jid, {
                video: { url: archivoAnimacion },
                gifPlayback: true,
                mimetype: "video/mp4",
                caption: etiqueta,
            });
        } catch (error) {
            console.warn("No se pudo enviar GIF de descarga:", error.message);
        }
    }

    if (!mensajeIndicador) {
        try {
            mensajeIndicador = await sock.sendMessage(jid, { text: "⏳ " + etiqueta });
        } catch (error) {
            console.warn("No se pudo enviar aviso de descarga:", error.message);
        }
    }

    let terminado = false;
    return async function finalizarIndicadorDescarga(ok) {
        if (terminado) return;
        terminado = true;
        // El GIF solo acompaña el proceso: retirarlo cuando se entrega el archivo.
        if (mensajeIndicador?.key) {
            try {
                await sock.sendMessage(jid, { delete: mensajeIndicador.key });
            } catch (error) {
                console.warn("No se pudo retirar el GIF de progreso:", error.message);
            }
        }
        await reaccionar(sock, jid, key, ok ? "✅" : "❌");
    };
}

module.exports = { ANIMACION_DESCARGA, iniciarIndicadorDescarga };
