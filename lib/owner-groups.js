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

    // Obtener únicamente los nombres de los grupos donde participa el bot.
    // Nunca exponer JIDs, participantes ni otros metadatos en la respuesta.
    const nombres = Object.entries(grupos)
        .filter(([jid]) => jid.endsWith("@g.us"))
        .map(([, metadata]) => limpiarNombreGrupo(metadata?.subject))
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    return { estado: "ok", cantidad: nombres.length, nombres };
}

function limpiarNombreGrupo(subject) {
    // Evitar que caracteres de control o saltos de línea rompan la lista.
    const nombre = String(subject || "")
        .replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u202a-\\u202e\\u2066-\\u2069]/g, " ")
        .replace(/\\s+/g, " ")
        .trim()
        .slice(0, 120);
    return nombre || "Grupo sin nombre";
}

function mensajesReporteGrupos(resultado, limite = 3000) {
    if (!resultado || resultado.estado !== "ok" || !Array.isArray(resultado.nombres)) {
        throw new Error("REPORTE_GRUPOS_INVALIDO");
    }
    if (!Number.isInteger(limite) || limite < 300) throw new Error("LIMITE_REPORTE_INVALIDO");

    const total = resultado.nombres.length;
    const encabezado = `🤖 *JABESHTBOT*\\n👥 Estoy en *${total}* ${total === 1 ? "grupo" : "grupos"} de WhatsApp.\\n\\n📋 *Nombres de los grupos:*`;
    if (total === 0) return [encabezado + "\\nNinguno por ahora."];

    const mensajes = [];
    let actual = encabezado;
    for (let i = 0; i < total; i++) {
        const nombre = limpiarNombreGrupo(resultado.nombres[i]);
        const linea = `\\n${i + 1}. ${nombre}`;
        if (actual.length + linea.length > limite) {
            mensajes.push(actual);
            actual = `📋 *Grupos de JABESHTBOT (continuación)*`;
        }
        actual += linea;
    }
    mensajes.push(actual);
    return mensajes;
}

module.exports = {
    NUMERO_CREADOR_PREDETERMINADO,
    numeroDesdeJidPn,
    esChatPrivado,
    esMensajeDelCreador,
    consultarGruposCreador,
    limpiarNombreGrupo,
    mensajesReporteGrupos,
};
