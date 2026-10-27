"use strict";

// WhatsApp no puede escribir en la carpeta Música del celular. Enviamos
// un archivo descargable adicional para que el usuario lo guarde allí.
const FORMATOS = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".webm": "audio/webm",
    ".opus": "audio/ogg",
    ".ogg": "audio/ogg",
};

function informacionArchivoAudio(titulo, extension) {
    const ext = String(extension || "").toLowerCase();
    const mimetype = FORMATOS[ext];
    if (!mimetype) throw new Error(`Formato de audio no soportado: ${ext}`);
    const nombre = String(titulo || "Musica")
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[.\s]+$/g, "")
        .slice(0, 100)
        .trim() || "Musica";
    return { mimetype, fileName: nombre + ext };
}

// Envío principal como reproductor de WhatsApp. El segundo envío es un
// documento para Guardar en Archivos / Música sin volver a convertirlo.
async function enviarAudioParaGuardar(sock, jid, { contenido, titulo, extension, adjuntarArchivo = true }) {
    const { mimetype, fileName } = informacionArchivoAudio(titulo, extension);
    await sock.sendMessage(jid, {
        audio: contenido,
        mimetype,
        ptt: false,
        fileName,
    });
    if (!adjuntarArchivo) return { fileName, archivoAdjunto: false, errorArchivo: null };
    try {
        await sock.sendMessage(jid, {
            document: contenido,
            mimetype,
            fileName,
        });
        return { fileName, archivoAdjunto: true, errorArchivo: null };
    } catch (error) {
        // No comunicar fracaso de toda la descarga cuando el audio ya llegó.
        return { fileName, archivoAdjunto: false, errorArchivo: error };
    }
}

module.exports = { informacionArchivoAudio, enviarAudioParaGuardar };
