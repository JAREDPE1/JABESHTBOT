"use strict";

// Extrae la respuesta de botones modernos y antiguos de WhatsApp.
// Los mensajes pueden llegar dentro de envoltorios ephemeral / viewOnce.
function extraerIdBoton(message) {
    let actual = message;
    for (let i = 0; i < 5 && actual; i++) {
        const envuelto = actual.ephemeralMessage?.message ||
            actual.viewOnceMessage?.message ||
            actual.viewOnceMessageV2?.message ||
            actual.viewOnceMessageV2Extension?.message;
        if (!envuelto) break;
        actual = envuelto;
    }
    if (!actual) return "";

    const directo = actual.buttonsResponseMessage?.selectedButtonId ||
        actual.templateButtonReplyMessage?.selectedId ||
        actual.listResponseMessage?.singleSelectReply?.selectedRowId;
    if (directo) return String(directo);

    const json = actual.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (!json) return "";
    try {
        const respuesta = JSON.parse(json);
        return String(respuesta.id || respuesta.selected_id || "");
    } catch {
        return "";
    }
}

function interpretarFormato(valor, token) {
    const respuesta = String(valor || "").trim().toLowerCase();
    if (token && respuesta === `formato_mp3_${token}`) return "mp3";
    if (token && respuesta === `formato_mp4_${token}`) return "mp4";
    if (["1", "mp3", "audio"].includes(respuesta)) return "mp3";
    if (["2", "mp4", "video"].includes(respuesta)) return "mp4";
    return null;
}

// Botones nativos (quick_reply). No requieren dependencias adicionales.
// La apariencia depende de la versión de WhatsApp del destinatario.
async function enviarBotonesFormato(sock, jid, { title, duracion, token, thumbnailBuffer }, baileys = require("@whiskeysockets/baileys")) {
    const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = baileys;
    const minutos = Math.floor(Math.max(0, Number(duracion) || 0) / 60);
    const segundos = String(Math.floor(Math.max(0, Number(duracion) || 0) % 60)).padStart(2, "0");

    const botones = [
        { name: "quick_reply", buttonParamsJson: JSON.stringify({
            display_text: "🎵 Audio MP3", id: `formato_mp3_${token}`
        }) },
        { name: "quick_reply", buttonParamsJson: JSON.stringify({
            display_text: "🎬 Video MP4", id: `formato_mp4_${token}`
        }) },
    ];

    let header = { title: "JABESHTBOT", hasMediaAttachment: false };
    if (thumbnailBuffer) {
        if (!prepareWAMessageMedia || !sock.waUploadToServer) throw new Error("NO_IMAGE_HEADER_SUPPORT");
        const media = await prepareWAMessageMedia(
            { image: thumbnailBuffer },
            { upload: sock.waUploadToServer }
        );
        header = { hasMediaAttachment: true, imageMessage: media.imageMessage };
    }

    const interactiveMessage = proto.Message.InteractiveMessage.create({
        header,
        body: { text: `🎵 *${String(title || "Sin título").slice(0, 250)}*\n⏱ ${minutos}:${segundos}\n\nElige el formato para descargar:` },
        footer: { text: "JABESHTBOT • Selecciona un botón" },
        nativeFlowMessage: {
            buttons: botones,
            messageParamsJson: "{}",
            messageVersion: 1,
        },
    });
    const mensaje = generateWAMessageFromContent(jid, { interactiveMessage }, {
        userJid: sock.user?.id,
    });

    const bizNode = {
        tag: "biz",
        attrs: {
            actual_actors: "2",
            host_storage: "2",
            privacy_mode_ts: String(Math.floor(Date.now() / 1000) - 77980457),
        },
        content: [
            { tag: "interactive", attrs: { type: "native_flow", v: "1" },
                content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }] },
            { tag: "quality_control", attrs: { source_type: "third_party" } },
        ],
    };
    const additionalNodes = jid.endsWith("@g.us")
        ? [bizNode]
        : [{ tag: "bot", attrs: { biz_bot: "1" } }, bizNode];

    await sock.relayMessage(jid, mensaje.message, {
        messageId: mensaje.key.id,
        additionalNodes,
    });
}

module.exports = { extraerIdBoton, interpretarFormato, enviarBotonesFormato };
