"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Catálogo único para ambos menús: botón interactivo y respaldo por texto.
const SECCIONES = [
    {
        "id": "descargas",
        "titulo": "🎵 Música y videos",
        "descripcion": "MP3, MP4 y enlaces",
        "comandos": [
            "🎵 *MÚSICA Y VIDEOS*",
            "• *!play nombre* — Busca una canción y elige MP3 o MP4.",
            "• *!lista nombre* — Muestra varios resultados para elegir.",
            "• *!yt URL* — Descarga contenido de YouTube.",
            "• *!video URL* — Video de YouTube, TikTok o Facebook.",
            "• *!fb URL* — Descarga desde Facebook.",
            "• *!tiktok URL* — Descarga desde TikTok.",
            "",
            "💡 Ejemplo: *!play Bad Bunny - Mónaco*"
        ]
    },
    {
        "id": "ia",
        "titulo": "🤖 Inteligencia artificial",
        "descripcion": "Chat, consultas e imágenes",
        "comandos": [
            "🤖 *INTELIGENCIA ARTIFICIAL*",
            "• *!ia pregunta* — Haz una consulta directa.",
            "• *!activaria* — Activa la conversación natural en este chat.",
            "• *!desactivaria* — Desactiva la conversación natural.",
            "• *!estadoia* — Consulta el estado de la IA.",
            "• *!buscar tema* — Busca en internet (requiere configuración).",
            "• *!reconocer* — Identifica una canción al responder a un audio (requiere AudD).",
            "• *Enviar foto o PDF* — Analiza contenido con IA si está habilitada.",
            "• *recuerda que ...* — Guarda una preferencia.",
            "• *qué recuerdas de mí* / *olvida todo* — Consulta o borra recuerdos.",
            "",
            "💡 En grupos, la IA natural está desactivada inicialmente."
        ]
    },
    {
        "id": "documentos",
        "titulo": "📄 Word y PowerPoint",
        "descripcion": "Trabajos y presentaciones",
        "comandos": [
            "📄 *DOCUMENTOS Y PRESENTACIONES*",
            "Escribe *!comando tema* para generar un documento Word:",
            "• *!resumen tema*",
            "• *!ensayo tema*",
            "• *!monografia tema*",
            "• *!exposicion tema*",
            "• *!introduccion tema*",
            "• *!conclusion tema*",
            "• *!objetivos tema*",
            "",
            "📊 *Para PowerPoint*, añade *-pptx* al comando:",
            "• *!resumen-pptx tema*",
            "• *!ensayo-pptx tema*",
            "• *!monografia-pptx tema*",
            "• *!exposicion-pptx tema*",
            "• *!introduccion-pptx tema*",
            "• *!conclusion-pptx tema*",
            "• *!objetivos-pptx tema*",
            "",
            "💡 Ejemplo: *!exposicion-pptx la Amazonía*"
        ]
    },
    {
        "id": "herramientas",
        "titulo": "🛠️ Herramientas",
        "descripcion": "Stickers, placa y DNI",
        "comandos": [
            "🛠️ *HERRAMIENTAS*",
            "• *!s* o *!sticker* — Responde a una foto o video para crear sticker.",
            "• *!placa ABC123* — Consulta vehicular (según API/configuración).",
            "• *!dni 12345678* — Consulta DNI (requiere API).",
            "• *!ping* — Comprueba la respuesta del bot.",
            "• *!estado* — Mira la información del bot.",
            "",
            "💡 Ejemplo: responde a una imagen con *!s*."
        ]
    },
    {
        "id": "grupos",
        "titulo": "👥 Grupos y miembros",
        "descripcion": "Administrar integrantes",
        "comandos": [
            "👥 *GRUPOS Y MIEMBROS*",
            "• *!añadir +519XXXXXXXX* — Agrega un integrante (requiere permisos del bot).",
            "• *!quitar @persona* — Retira un integrante (requiere permisos del bot).",
            "• *!activaria* — Activa respuestas naturales de IA en el grupo.",
            "• *!desactivaria* — Desactiva esas respuestas.",
            "• *!estadoia* — Consulta el estado de la IA en el grupo.",
            "",
            "💡 Las acciones sobre miembros requieren permisos de administrador."
        ]
    },
    {
        "id": "avisos",
        "titulo": "🔔 Avisos de redes",
        "descripcion": "Kick, TikTok, YouTube, Instagram",
        "comandos": [
            "🔔 *NOTIFICACIONES DE REDES*",
            "🎮 *Kick*",
            "• *!activarkick* / *!desactivarkick* / *!verkick*",
            "",
            "🎬 *TikTok*",
            "• *!activartiktok @usuario*",
            "• *!desactivartiktok @usuario* / *!vertiktok*",
            "",
            "📺 *YouTube*",
            "• *!activaryoutube @canal*",
            "• *!desactivaryoutube @canal* / *!veryoutube*",
            "",
            "📸 *Instagram*",
            "• *!activarinstagram @usuario*",
            "• *!desactivarinstagram @usuario* / *!verinstagram*",
            "",
            "💡 Las activaciones de avisos se configuran en grupos."
        ]
    },
    {
        "id": "informacion",
        "titulo": "ℹ️ Información y ayuda",
        "descripcion": "Menú, creador y estado",
        "comandos": [
            "ℹ️ *INFORMACIÓN Y AYUDA*",
            "• *!menu* — Abre este menú interactivo.",
            "• *!ayuda* — Otra forma de abrir el menú.",
            "• *!start* — Mensaje de bienvenida.",
            "• *.creador* o *!creador* — Créditos del bot.",
            "• *!ping* — Comprobar respuesta.",
            "• *!estado* — Estado del bot.",
            "",
            "💡 Selecciona otra categoría en el botón inferior."
        ]
    },
    {
        "id": "administracion",
        "titulo": "🔐 Administración",
        "descripcion": "Solo creador; usar por privado",
        "soloCreador": true,
        "comandos": [
            "🔐 *ADMINISTRACIÓN — SOLO CREADOR*",
            "• *!gru* — Muestra cuántos grupos tiene el bot y sus nombres.",
            "• *!actualizar* — Revisa GitHub, actualiza la instalación y reinicia PM2.",
            "• *!reiniciar* — Reinicia únicamente el proceso PM2 del bot.",
            "• *!estadoactualizacion* — Consulta el estado del mantenimiento remoto.",
            "",
            "⚠️ Disponible solo desde el chat privado del creador.",
            "⚠️ Para actualizar o reiniciar debe estar activado *BOT_REMOTE_ADMIN_ENABLED=true* en el servidor."
        ]
    }
];

function obtenerSecciones({ creador = false } = {}) {
    return SECCIONES.filter(seccion => creador || !seccion.soloCreador);
}

function obtenerSeccion(id, { creador = false } = {}) {
    return obtenerSecciones({ creador }).find(seccion => seccion.id === id) || null;
}

function textoSeccion(id, opciones) {
    const seccion = obtenerSeccion(id, opciones);
    if (!seccion) return null;
    return seccion.comandos.join("\n") + "\n\n↩️ Pulsa *📚 Otras secciones* o escribe *!menu*.";
}

function textoCategorias({ creador = false } = {}) {
    const lista = obtenerSecciones({ creador });
    return "📚 *MENÚ DE JABESHTBOT*\n\n" +
        lista.map((s, i) => (i + 1) + ". " + s.titulo).join("\n") +
        "\n\nResponde con el número de una categoría.\nO escribe *!menu* para abrir el botón.";
}

const startMenuText = "👋 ¡Hola! Soy *JABESHTBOT*.\n" +
    "🎵 Música y videos · 🤖 IA · 📄 Documentos · 🛠️ Herramientas\n\n" +
    "Pulsa *📚 Ver comandos* para elegir una sección.";
const botMenuText = "📚 *MENÚ DE JABESHTBOT*\n\n" +
    "Encuentra fácilmente lo que necesitas por categoría.\n" +
    "Pulsa *📚 Ver comandos* y elige una sección.\n\n" +
    "¿No ves el botón? Escribe *!menutexto*.";

const menuImagePath = path.join(__dirname, "fotoo.png");
const hasMenuImage = fs.existsSync(menuImagePath);

module.exports = {
    SECCIONES, obtenerSecciones, obtenerSeccion, textoSeccion, textoCategorias,
    startMenuText, botMenuText, menuImagePath, hasMenuImage,
};
