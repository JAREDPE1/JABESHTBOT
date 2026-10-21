"use strict";

const { randomInt } = require("node:crypto");

const PENDIENTE_MS = 5 * 60_000;
const solicitudes = new Map();
const frecuencia = new Map();

function interpretarComandoGrupo(texto) {
    const match = String(texto || "").trim().match(/^!(añadir|anadir|agregar|quitar|aprobar|rechazar)(?:\s+(.+))?$/i);
    if (!match) return null;
    const nombre = match[1].toLowerCase();
    return {
        accion: ["añadir", "anadir", "agregar"].includes(nombre) ? "add" : nombre === "quitar" ? "remove" : nombre,
        argumento: (match[2] || "").trim(),
    };
}

// Perú (9 dígitos que comienzan por 9), o formato internacional E.164.
// Para otros países se debe escribir el prefijo, por ejemplo +34612345678.
function numeroInternacional(entrada) {
    const limpio = String(entrada || "").replace(/[\s()+-]/g, "");
    if (!/^\d{8,15}$/.test(limpio)) return null;
    if (limpio.length === 9) return limpio.startsWith("9") ? "51" + limpio : null;
    if (!/^[1-9]/.test(limpio)) return null;
    return limpio;
}

function normalizarId(id) {
    return typeof id === "string" ? id.replace(/:\d+(?=@)/, "").toLowerCase() : "";
}
function idsMiembro(p) {
    if (typeof p === "string") return [normalizarId(p)];
    return [p?.id, p?.lid, p?.phoneNumber, p?.pn, p?.jid].filter(Boolean).map(normalizarId);
}
function mismoMiembro(a, b) {
    const aIds = new Set(idsMiembro(a));
    return idsMiembro(b).some(id => aIds.has(id));
}
function localizarMiembro(metadata, objetivo) {
    return metadata?.participants?.find(p => mismoMiembro(p, objetivo)) || null;
}
function admin(p) {
    return p?.admin === "admin" || p?.admin === "superadmin";
}
function botAdmin(metadata, sock) {
    return (metadata?.participants || []).some(p =>
        admin(p) && [sock?.user?.id, sock?.user?.lid, sock?.user?.jid].filter(Boolean).some(id => mismoMiembro(p, id)));
}
function contexto(msg) {
    const m = msg?.message?.ephemeralMessage?.message || msg?.message || {};
    return m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo || {};
}
function objetivoComando(comando, msg) {
    const ctx = contexto(msg);
    const mencionado = ctx.mentionedJid?.find(x => typeof x === "string" && /@(s\.whatsapp\.net|lid)$/.test(x));
    if (mencionado) return mencionado;
    const numero = numeroInternacional(comando.argumento.replace(/^@/, ""));
    if (numero) return numero + "@s.whatsapp.net";
    if (comando.accion === "remove" && ctx.quotedMessage && ctx.participant) return ctx.participant;
    return null;
}
function limpiarVencidos(ahora) {
    for (const [id, item] of solicitudes) if (ahora > item.vence) solicitudes.delete(id);
}
function limitar(grupo, autor, ahora) {
    const key = grupo + "|" + autor;
    const recientes = (frecuencia.get(key) || []).filter(t => ahora - t < 10 * 60_000);
    if (recientes.length >= 2) { frecuencia.set(key, recientes); return false; }
    frecuencia.set(key, [...recientes, ahora]);
    if (frecuencia.size > 1000) {
        for (const [k, values] of frecuencia) {
            if (values.every(t => ahora - t >= 10 * 60_000)) frecuencia.delete(k);
        }
    }
    return true;
}
function estadoWhatsApp(resultado, accion) {
    const data = Array.isArray(resultado) ? resultado[0] : resultado;
    const status = String(data?.status || "");
    if (status === "200") return accion === "add" ?
        "✅" : "✅ Integrante retirado correctamente.";
    if (status === "403") return accion === "add" ?
        "⚠️ WhatsApp no permitió añadirlo directamente por privacidad o permisos. La persona podría necesitar una invitación." :
        "⚠️ WhatsApp rechazó la expulsión por permisos.";
    if (status === "404") return "❌ WhatsApp no encuentra el número o participante.";
    if (status === "408" || status === "429") return "⏳ WhatsApp limitó la solicitud. Inténtalo más tarde.";
    return "⚠️ WhatsApp devolvió el estado " + (status || "desconocido") + "; no se confirmó el cambio.";
}

async function administrarGrupo(sock, grupo, msg, comando, ahora = Date.now()) {
    if (!grupo?.endsWith("@g.us")) return "Solo funciona dentro de un grupo.";
    const metadata = await sock.groupMetadata(grupo);
    const autor = msg?.key?.participant || "";
    if (!localizarMiembro(metadata, autor)) return "Solo los integrantes del grupo pueden enviar solicitudes.";

    if (comando.accion === "aprobar" || comando.accion === "rechazar") {
        if (!admin(localizarMiembro(metadata, autor))) return "🔒 Solo un administrador puede aprobar o rechazar solicitudes.";
        limpiarVencidos(ahora);
        const id = comando.argumento.toUpperCase();
        const solicitud = solicitudes.get(grupo + "|" + id);
        if (!solicitud) return "❌ Solicitud inexistente o vencida. Dura 5 minutos.";
        if (comando.accion === "rechazar") {
            solicitudes.delete(grupo + "|" + id);
            return "✅ Solicitud " + id + " rechazada.";
        }
        if (!botAdmin(metadata, sock)) return "🔒 El bot también debe ser administrador para ejecutar el cambio.";
        const destinoActual = localizarMiembro(metadata, solicitud.destino);
        if (solicitud.accion === "remove") {
            if (!destinoActual) { solicitudes.delete(grupo + "|" + id); return "La persona ya no está en el grupo."; }
            if (admin(destinoActual)) return "🔒 No se puede expulsar a otros administradores.";
            if ([sock?.user?.id, sock?.user?.lid].filter(Boolean).some(i => mismoMiembro(destinoActual, i))) {
                return "🔒 El bot no puede expulsarse a sí mismo.";
            }
        } else if (destinoActual) {
            solicitudes.delete(grupo + "|" + id);
            return "ℹ️ Esa persona ya pertenece al grupo.";
        }
        solicitudes.delete(grupo + "|" + id);
        const resultado = await sock.groupParticipantsUpdate(grupo,
            [solicitud.accion === "remove" ? destinoActual.id : solicitud.destino], solicitud.accion);
        return estadoWhatsApp(resultado, solicitud.accion);
    }

    if (!botAdmin(metadata, sock)) return "🔒 Convierte a JABESHTBOT en administrador para gestionar integrantes.";
    const destino = objetivoComando(comando, msg);
    if (!destino) return comando.accion === "add" ?
        "Uso: *!añadir +51987654321* o *!añadir +34612345678* (incluye prefijo internacional)." :
        "Uso: *!quitar @persona*, *!quitar +51987654321* o responde a su mensaje con *!quitar*.";
    const miembro = localizarMiembro(metadata, destino);
    if (comando.accion === "remove") {
        if (!miembro) return "No encuentro ese número en el grupo. Es preferible mencionarlo o responder a su mensaje.";
        if (admin(miembro)) return "🔒 No se pueden expulsar administradores.";
        if ([sock?.user?.id, sock?.user?.lid].filter(Boolean).some(i => mismoMiembro(miembro, i))) return "🔒 El bot no puede expulsarse.";
    } else if (miembro) return "ℹ️ Ese número ya está dentro del grupo.";

    limpiarVencidos(ahora);
    if (!limitar(grupo, autor, ahora)) return "⏳ Límite de dos solicitudes cada 10 minutos por integrante.";
    if (comando.accion === "add") {
        const resultado = await sock.groupParticipantsUpdate(grupo, [destino], "add");
        return estadoWhatsApp(resultado, "add");
    }

    const id = String(randomInt(100000, 1000000));
    solicitudes.set(grupo + "|" + id, { accion: comando.accion, destino: miembro?.id || destino, vence: ahora + PENDIENTE_MS });
    if (solicitudes.size > 400) limpiarVencidos(ahora + PENDIENTE_MS);
    return (comando.accion === "add" ? "➕ Solicitud de añadir" : "➖ Solicitud de quitar") +
        " registrada (ID *" + id + "*).\nUn administrador debe enviar *!aprobar " + id +
        "* o *!rechazar " + id + "* antes de 5 minutos.";
}

module.exports = { interpretarComandoGrupo, numeroInternacional, objetivoComando,
    administrarGrupo, botAdmin, admin, localizarMiembro, estadoWhatsApp };
