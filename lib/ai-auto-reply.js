"use strict";

const { iaActivaEnGrupo } = require("./ai-group-controls");
const { iaActivaEnPrivado } = require("./ai-private-controls");

// Una conversación directa se responde sin "Hola IA" ni signo !.
// Respeta comandos explícitos, flujos interactivos y grupos desactivados.
function debeResponderNatural({ texto, jid, config, sesionDescargaActiva = false } = {}) {
    if (typeof texto !== "string" || !texto.trim() || typeof jid !== "string") return false;
    if (/^[!.]/.test(texto.trim())) return false;
    if (sesionDescargaActiva) return false;
    const esGrupo = jid.endsWith("@g.us");
    const esPrivado = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
    if (!esGrupo && !esPrivado) return false;
    if (esGrupo && !iaActivaEnGrupo(config, jid)) return false;
    if (esPrivado && !iaActivaEnPrivado(config, jid)) return false;
    return true;
}

module.exports = { debeResponderNatural };
