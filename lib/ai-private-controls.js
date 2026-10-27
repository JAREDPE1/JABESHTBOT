"use strict";

// La IA conversacional funciona en privados por defecto.
// Un usuario puede apagarla solo para su chat sin afectar a otras personas.
function esChatPrivado(jid) {
    return typeof jid === "string" &&
        (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"));
}

function iaActivaEnPrivado(config, jid) {
    if (!esChatPrivado(jid)) return false;
    // Sólo guardamos excepciones desactivadas; no cambia chats ya existentes.
    return config?.iaConversacionPrivados?.[jid] !== false;
}

function configurarIaPrivado(config, jid, activa) {
    if (!esChatPrivado(jid)) throw new Error("CHAT_PRIVADO_INVALIDO");
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("CONFIG_INVALIDA");
    }
    if (!config.iaConversacionPrivados || typeof config.iaConversacionPrivados !== "object" ||
        Array.isArray(config.iaConversacionPrivados)) {
        config.iaConversacionPrivados = {};
    }
    if (activa) delete config.iaConversacionPrivados[jid];
    else config.iaConversacionPrivados[jid] = false;
}

// Evita que una solicitud de IA en curso conteste después de desactivar.
function cancelarSesionIaPrivado(conversaciones, jid) {
    if (!esChatPrivado(jid)) return false;
    const sesion = conversaciones.get(jid);
    if (!sesion) return false;
    sesion.cancelado = true;
    conversaciones.delete(jid);
    return true;
}

module.exports = {
    esChatPrivado,
    iaActivaEnPrivado,
    configurarIaPrivado,
    cancelarSesionIaPrivado,
};
