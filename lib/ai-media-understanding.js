"use strict";

const axios = require("axios");
const MAX_BYTES = { image: 8 * 1024 * 1024, pdf: 10 * 1024 * 1024 };

function desempaquetar(message) {
    if (!message) return null;
    return message.ephemeralMessage?.message ||
        message.documentWithCaptionMessage?.message || message;
}

function buscarMediaWhatsApp(msg, tipos = ["image", "pdf", "audio"]) {
    const localizar = (mensaje, key) => {
        const m = desempaquetar(mensaje);
        if (!m) return null;
        if (tipos.includes("image") && m.imageMessage) {
            return { mensaje: { key, message: { imageMessage: m.imageMessage } }, tipo: "image", mime: m.imageMessage.mimetype || "image/jpeg" };
        }
        if (tipos.includes("pdf") && m.documentMessage &&
            m.documentMessage.mimetype === "application/pdf") {
            return { mensaje: { key, message: { documentMessage: m.documentMessage } }, tipo: "pdf", mime: "application/pdf" };
        }
        if (tipos.includes("audio") && m.audioMessage) {
            return { mensaje: { key, message: { audioMessage: m.audioMessage } }, tipo: "audio", mime: m.audioMessage.mimetype || "audio/ogg" };
        }
        if (tipos.includes("audio") && m.videoMessage) {
            return { mensaje: { key, message: { videoMessage: m.videoMessage } }, tipo: "video", mime: m.videoMessage.mimetype || "video/mp4" };
        }
        return null;
    };
    if (!msg?.message) return null;
    const directo = localizar(msg.message, msg.key);
    if (directo) return directo;
    const m = desempaquetar(msg.message);
    const info = m?.extendedTextMessage?.contextInfo ||
        m?.imageMessage?.contextInfo || m?.documentMessage?.contextInfo ||
        m?.audioMessage?.contextInfo;
    if (!info?.quotedMessage) return null;
    return localizar(info.quotedMessage, {
        remoteJid: msg.key.remoteJid, id: info.stanzaId,
        participant: info.participant,
    });
}

function validarMedia(buffer, tipo, mime) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("MEDIA_VACIA");
    const permitido = tipo === "image" ?
        ["image/jpeg", "image/png", "image/webp"].includes(mime) :
        tipo === "pdf" && mime === "application/pdf";
    if (!permitido) throw new Error("MEDIA_MIME");
    if (buffer.length > MAX_BYTES[tipo]) throw new Error("MEDIA_GRANDE");
}

function textoGemini(datos) {
    return (datos?.candidates?.[0]?.content?.parts || [])
        .map(p => p?.text || "").filter(Boolean).join("\n").trim();
}

async function analizarMediaGemini({ buffer, tipo, mime, pregunta, apiKey, model, post = axios.post }) {
    validarMedia(buffer, tipo, mime);
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");
    const prompt = String(pregunta || (tipo === "pdf" ?
        "Resume el documento en español, destacando los puntos importantes." :
        "Describe esta imagen en español, con detalle útil y sin inventar información.")).slice(0, 2500);
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model || "gemini-2.5-flash-lite") + ":generateContent";
    const { data } = await post(url, {
        contents: [{
            role: "user",
            parts: [
                { inlineData: { mimeType: mime, data: buffer.toString("base64") } },
                { text: prompt },
            ],
        }],
        generationConfig: { maxOutputTokens: 1500 },
    }, {
        timeout: 90000,
        maxBodyLength: 19 * 1024 * 1024,
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    });
    const texto = textoGemini(data);
    if (!texto) throw new Error("GEMINI_EMPTY_RESPONSE");
    return texto;
}

module.exports = { buscarMediaWhatsApp, validarMedia, analizarMediaGemini, textoGemini };
