"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Conservamos el umbral que ya usaba JABESHTBOT para el video reproducible.
// Por debajo del límite intentamos video normal; por encima, MP4 como documento.
const LIMITE_VIDEO_NORMAL_BYTES = 60 * 1024 * 1024;
// Margen conservador por debajo del límite anunciado de 2 GB para documentos.
// El proveedor y Baileys pueden imponer restricciones adicionales.
const LIMITE_DOCUMENTO_BYTES = 1900 * 1024 * 1024;

function nombreVideoSeguro(titulo) {
    const limpio = String(titulo || "Video")
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 90);
    return (limpio || "Video") + ".mp4";
}

function tamanoMegabytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1);
}

async function enviarVideoConAlternativa(sock, jid, archivo, titulo) {
    const stats = fs.statSync(archivo);
    if (!stats.isFile() || stats.size <= 0) throw new Error("VIDEO_VACIO");

    const bytes = stats.size;
    const tamano = tamanoMegabytes(bytes);
    const fileName = nombreVideoSeguro(titulo);
    const ruta = path.resolve(archivo);

    if (bytes > LIMITE_DOCUMENTO_BYTES) {
        await sock.sendMessage(jid, {
            text: "⚠️ El video pesa *" + tamano + " MB*, demasiado para enviarlo de forma segura como archivo. No lo enviaré ni lo reemplazaré por audio."
        });
        return { modo: "demasiado_grande", tamano };
    }

    const enviarDocumento = async () => {
        await sock.sendMessage(jid, {
            document: { url: ruta },
            mimetype: "video/mp4",
            fileName,
        });
        return { modo: "documento", tamano };
    };

    if (bytes > LIMITE_VIDEO_NORMAL_BYTES) {
        await sock.sendMessage(jid, {
            text: "⚠️ El video pesa *" + tamano + " MB* y es muy grande para enviarlo como video normal. 📁 Te lo envío como archivo *MP4*."
        });
        return enviarDocumento();
    }

    try {
        await sock.sendMessage(jid, {
            video: { url: ruta },
            mimetype: "video/mp4",
            fileName,
        });
        return { modo: "video", tamano };
    } catch (error) {
        console.warn("Video normal rechazado. Probando documento:", error.message);
        await sock.sendMessage(jid, {
            text: "⚠️ WhatsApp no aceptó el video como reproducción normal. 📁 Intentaré enviarlo como archivo *MP4*."
        });
        return enviarDocumento();
    }
}

module.exports = {
    LIMITE_VIDEO_NORMAL_BYTES,
    LIMITE_DOCUMENTO_BYTES,
    nombreVideoSeguro,
    enviarVideoConAlternativa,
};
