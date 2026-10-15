"use strict";

// En grupos la conversación libre con IA está apagada por defecto.
// Este ajuste no bloquea los comandos explícitos (!ia, !resumen, etc.).
function iaActivaEnGrupo(config, jid) {
    return config?.iaConversacionGrupos?.[jid] === true;
}

function configurarIaGrupo(config, jid, activa) {
    if (!jid || !jid.endsWith("@g.us")) throw new Error("GRUPO_INVALIDO");
    if (!config.iaConversacionGrupos || typeof config.iaConversacionGrupos !== "object" ||
        Array.isArray(config.iaConversacionGrupos)) {
        config.iaConversacionGrupos = {};
    }
    if (activa) config.iaConversacionGrupos[jid] = true;
    else delete config.iaConversacionGrupos[jid];
}

function identificador(jid) {
    return typeof jid === "string" ? jid.replace(/:\d+(?=@)/, "") : "";
}

function esAdministradorGrupo(metadata, remitente) {
    const autor = identificador(remitente);
    if (!autor || !metadata || !Array.isArray(metadata.participants)) return false;
    const participante = metadata.participants.find(p =>
        [p.id, p.lid, p.phoneNumber].some(id => identificador(id) === autor));
    return Boolean(participante && (participante.admin === "admin" || participante.admin === "superadmin"));
}

function cancelarSesionesIaGrupo(conversaciones, jid) {
    let cantidad = 0;
    for (const [clave, sesion] of conversaciones) {
        if (clave.startsWith(jid + ":")) {
            // Evita que una respuesta en proceso llegue después de desactivar.
            sesion.cancelado = true;
            conversaciones.delete(clave);
            cantidad++;
        }
    }
    return cantidad;
}

module.exports = {
    iaActivaEnGrupo,
    configurarIaGrupo,
    esAdministradorGrupo,
    cancelarSesionesIaGrupo,
};
