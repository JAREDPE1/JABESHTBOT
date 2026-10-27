"use strict";

// !gru es exclusivo del dueño y solo responde en conversación privada.
// WhatsApp/Baileys v7 puede usar PN JIDs (@s.whatsapp.net) o LID JIDs (@lid).
// Nunca inferir el número de teléfono a partir de los dígitos de un LID.
const NUMERO_CREADOR_PREDETERMINADO = "51957211832";

function numeroDesdeJidPn(jid) {
    if (typeof jid !== "string") return null;
    const match = /^([0-9]+)(?::[0-9]+)?@s\.whatsapp\.net$/.exec(jid);
    return match ? match[1] : null;
}

function esChatPrivado(jid) {
    return typeof jid === "string" && /@(s\.whatsapp\.net|lid)$/.test(jid);
}

async function esMensajeDelCreador(sock, key, numeroCreador = process.env.BOT_OWNER_NUMBER || NUMERO_CREADOR_PREDETERMINADO) {
    if (!key || key.fromMe || !esChatPrivado(key.remoteJid)) return false;
    // Exigir número completo con código de país, sin prefijos ni coincidencias parciales.
    if (!/^\d{10,15}$/.test(String(numeroCreador))) return false;

    const numeroPrincipal = numeroDesdeJidPn(key.remoteJid);
    if (numeroPrincipal) return numeroPrincipal === numeroCreador;

    // Un @lid no es un teléfono. El número alternativo lo proporciona Baileys.
    const numeroAlternativo = numeroDesdeJidPn(key.remoteJidAlt);
    if (numeroAlternativo) return numeroAlternativo === numeroCreador;

    // Si no llega una identidad telefónica verificada, consultar el mapeo
    // almacenado por la sesión. Si no existe, negar el acceso por seguridad.
    try {
        const pnJid = await sock?.signalRepository?.lidMapping?.getPNForLID?.(key.remoteJid);
        return numeroDesdeJidPn(pnJid) === numeroCreador;
    } catch {
        return false;
    }
}

async function consultarGruposCreador(sock, key, numeroCreador) {
    if (!esChatPrivado(key?.remoteJid)) return { estado: "solo_privado" };
    if (!(await esMensajeDelCreador(sock, key, numeroCreador))) return { estado: "no_autorizado" };

    const grupos = await sock.groupFetchAllParticipating();
    if (!grupos || typeof grupos !== "object" || Array.isArray(grupos)) {
        throw new Error("RESPUESTA_GRUPOS_INVALIDA");
    }

    // La consulta devuelve únicamente los grupos en los que participa la
    // cuenta WhatsApp vinculada al bot en este momento.
    const cantidad = Object.keys(grupos).filter(jid => jid.endsWith("@g.us")).length;
    return { estado: "ok", cantidad };
}

function mensajeCantidadGrupos(cantidad) {
    return `🤖 *JABESHTBOT*\n👥 Actualmente estoy en *${cantidad}* ${cantidad === 1 ? "grupo" : "grupos"} de WhatsApp.`;
}

module.exports = {
    NUMERO_CREADOR_PREDETERMINADO,
    numeroDesdeJidPn,
    esChatPrivado,
    esMensajeDelCreador,
    consultarGruposCreador,
    mensajeCantidadGrupos,
};
