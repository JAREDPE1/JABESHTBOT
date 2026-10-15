"use strict";

const IMAGE_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = "gemini-3.1-flash-lite-image";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function normalizar(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim();
}

// Solo solicitudes de CREACIÓN visual. Nunca interpretar comandos ! / .
// Funciona con "Hola IA, créame una imagen..." y "Créame un hombre en la Luna".
function detectarSolicitudImagen(texto) {
    if (typeof texto !== "string" || texto.length > 3000) return null;
    const frase = normalizar(texto);
    if (!frase || /^[!.]/.test(frase)) return null;

    const medio = /\b(imagen|imagenes|foto|fotos|fotografia|ilustracion|dibujo|retrato|poster|afiche|meme|logo|banner|arte visual)\b/.test(frase);
    const verbo = /\b(crea|creame|crear|genera|generame|generar|haz|hazme|hacer|dibujar|dibuja|dibujame|ilustra|ilustrame|pinta|pintame|disena|disename|renderiza|quiero|necesito|mandame|enviame|puedes|podrias|haz una)\b/.test(frase);
    if (medio && verbo) {
        // "¿Puedes crear imágenes?" es una pregunta de capacidad, no un encargo visual.
        const resto = frase.replace(/\b(hola|oye|ia|jabesht|bot|puedes|podrias|hacer|hazme|haz|crear|crea|creame|generar|genera|generame|quiero|necesito|una|un|las|los|imagenes|imagen|foto|fotos|fotografia|ilustracion|dibujo|retrato|poster|afiche|meme|logo|banner|por|favor|me|para|mi|mandame|enviame|que|tal|como|estas)\b/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        if (resto.length < 3) return null;
        return texto.trim().slice(0, 1500);
    }

    // Si no dice "imagen", reconocemos verbos inequívocos con una escena/sujeto.
    if (!/\b(creame|generame|dibujame|ilustrame|pintame|disename|dibuja|ilustra|pinta|renderiza)\b/.test(frase)) return null;
    if (!/\b(un|una|unos|unas|al|el|la)\b/.test(frase)) return null;
    const tareasTexto = /\b(resumen|ensayo|monografia|introduccion|conclusion|objetivos|exposicion|documento|word|pdf|powerpoint|pptx|poema|cuento|historia|explicacion|texto|lista|codigo|programa|script|pagina web|cancion|musica|reporte|informe|presentacion|tabla|tarea|proyecto)\b/.test(frase);
    if (tareasTexto) return null;
    return texto.trim().slice(0, 1500);
}

function imageGenerationEnabled(env = process.env) {
    return String(env.IMAGE_GENERATION_ENABLED || "false").toLowerCase() === "true";
}

function crearLimitadorImagenes(maximo = 3, ventanaMs = 60 * 60_000) {
    const usos = new Map();
    return function admitir(clave, ahora = Date.now()) {
        const previos = (usos.get(clave) || []).filter(t => ahora - t < ventanaMs);
        if (previos.length >= maximo) {
            usos.set(clave, previos);
            return false;
        }
        previos.push(ahora);
        usos.set(clave, previos);
        // Evitar que el mapa de remitentes crezca indefinidamente.
        if (usos.size > 1500) {
            for (const [key, registros] of usos) {
                if (registros.every(t => ahora - t >= ventanaMs)) usos.delete(key);
            }
        }
        return true;
    };
}

function extraerImagenRespuesta(respuesta) {
    const imagen = respuesta?.output_image ||
        respuesta?.steps?.filter(s => s?.type === "model_output").flatMap(s => s?.content || []).find(p => p?.type === "image") ||
        respuesta?.outputs?.find(p => p?.type === "image");

    const mimeType = imagen?.mime_type || imagen?.mimeType || "image/png";
    if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) return null;

    const encoded = imagen?.data;
    if (typeof encoded !== "string" || !encoded) return null;
    // Aceptar contenido base64 válido, evitando buffers vacíos o enormes.
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length > MAX_IMAGE_BYTES * 1.4) return null;
    const buffer = Buffer.from(encoded, "base64");
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;
    return { buffer, mimetype: mimeType };
}

async function generarImagenGemini(prompt, { apiKey, model = DEFAULT_MODEL, post } = {}) {
    if (!apiKey) throw new Error("IMAGE_MISSING_KEY");
    if (typeof post !== "function") throw new Error("IMAGE_MISSING_HTTP");
    if (typeof prompt !== "string" || !prompt.trim()) throw new Error("IMAGE_MISSING_PROMPT");

    const { data } = await post(IMAGE_API_URL, {
        model,
        input: prompt.trim().slice(0, 1500),
        response_format: { type: "image", aspect_ratio: "1:1", image_size: "1K" },
    }, {
        timeout: 120000,
        maxBodyLength: 25 * 1024 * 1024,
        maxContentLength: 25 * 1024 * 1024,
        headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    });

    const imagen = extraerImagenRespuesta(data);
    if (!imagen) throw new Error("IMAGE_NO_OUTPUT");
    return imagen;
}

function mensajeErrorImagen(err) {
    const codigo = err?.response?.status;
    if (codigo === 401) return "❌ La clave Gemini para imágenes no es válida. Revisa GEMINI_IMAGE_API_KEY o GEMINI_API_KEY.";
    if (codigo === 402 || codigo === 403) return "⚠️ La API de Gemini no tiene habilitado el acceso a imágenes. Verifica el plan, la facturación y los permisos en Google AI Studio.";
    if (codigo === 429) return "⏳ Gemini alcanzó el límite de consultas de imágenes. Intenta más tarde o revisa tu cuota.";
    if (codigo === 400) return "⚠️ Gemini no aceptó la solicitud de imagen. Revisa el modelo configurado y la descripción.";
    if (codigo >= 500 || err?.code === "ECONNABORTED") return "⏳ El servicio de imágenes está ocupado. Intenta en unos minutos.";
    if (err?.message === "IMAGE_NO_OUTPUT") return "No se generó ninguna imagen con esta petición. Intenta describir otra escena.";
    return "❌ No pude generar la imagen ahora. Revisa los registros de JABESHTBOT.";
}

module.exports = {
    DEFAULT_MODEL,
    detectarSolicitudImagen,
    imageGenerationEnabled,
    crearLimitadorImagenes,
    extraerImagenRespuesta,
    generarImagenGemini,
    mensajeErrorImagen,
};
