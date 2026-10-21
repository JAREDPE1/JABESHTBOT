"use strict";

const frecuencia = new Map();

function interpretarComandoGrupo(texto) {
    const match = String(texto || "").trim().match(/^!(añadir|anadir|agregar|quitar)(?:\s+(.+))?$/i);
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
// Cuentas protegidas: los valores reales solo viven en .env (ignorado por Git).
// Se admiten números E.164 y, opcionalmente, JIDs de Baileys (incluidos @lid).
function telefonosProtegidos(env = process.env) {
    const valores = String(env.GROUP_PROTECTED_NUMBERS || "").split(/[,\s;]+/);
    return new Set(valores.map(numeroInternacional).filter(Boolean));
}
function jidsProtegidos(env = process.env) {
    return new Set(String(env.GROUP_PROTECTED_JIDS || "").split(/[,\s;]+/)
        .map(normalizarId).filter(jid => jid.endsWith("@lid") || jid.endsWith("@s.whatsapp.net")));
}
function telefonoDelIdentificador(valor) {
    if (typeof valor !== "string") return null;
    const jid = normalizarId(valor);
    // El ID de privacidad @lid NO es el número de teléfono.
    if (jid.includes("@") && !jid.endsWith("@s.whatsapp.net") && !jid.endsWith("@c.us")) return null;
    return numeroInternacional(jid.split("@")[0]);
}
async function evaluarProteccionGrupo(participante, sock, env = process.env) {
    const identidadesBot = [sock?.user?.id, sock?.user?.lid, sock?.user?.jid].filter(Boolean);
    if (identidadesBot.some(id => mismoMiembro(participante, id))) return "protegido";

    const aliases = idsMiembro(participante);
    const ids = jidsProtegidos(env);
    if (aliases.some(id => ids.has(id))) return "protegido";

    const telefonos = telefonosProtegidos(env);
    if (!telefonos.size) return null;
    const conocidos = aliases.map(telefonoDelIdentificador).filter(Boolean);
    if (conocidos.some(tel => telefonos.has(tel))) return "protegido";

    // WhatsApp puede identificar integrantes solo mediante LID. Intentamos
    // resolverlo a número; si no podemos, no autorizamos expulsiones dudosas.
    if (!conocidos.length) {
        const lids = aliases.filter(id => id.endsWith("@lid"));
        if (lids.length) {
            const mapeo = sock?.signalRepository?.lidMapping;
            for (const lid of lids) {
                let pn = null;
                try {
                    if (typeof mapeo?.getPNForLID === "function") pn = await mapeo.getPNForLID(lid);
                } catch (err) {
                    console.warn("No se pudo resolver identidad LID protegida:", err.message);
                }
                const numero = telefonoDelIdentificador(pn);
                if (numero && telefonos.has(numero)) return "protegido";
                if (!numero) return "sin_verificar";
            }
        }
    }
    return null;
}
function mensajeProteccion(estado) {
    return estado === "sin_verificar"
        ? "🔒 No puedo verificar con seguridad la identidad de esa cuenta. No se permite expulsarla."
        : "🔒 Esa cuenta está protegida y no se puede expulsar.";
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
async function comprobarNumeroWhatsApp(sock, jid) {
    // Las menciones con @lid ya son identificadores resueltos por WhatsApp.
    if (!jid.endsWith("@s.whatsapp.net")) return jid;
    if (typeof sock.onWhatsApp !== "function") throw new Error("ON_WHATSAPP_NO_DISPONIBLE");
    const registros = await sock.onWhatsApp(jid);
    const registrado = Array.isArray(registros) ? registros.find(item => item?.exists === true) : null;
    if (!registrado) return null;
    const real = registrado.jid;
    return typeof real === "string" && (real.endsWith("@s.whatsapp.net") || real.endsWith("@lid")) ? real : jid;
}

function estadoWhatsApp(resultado, accion) {
    const data = Array.isArray(resultado) ? resultado[0] : resultado;
    const status = String(data?.status || "");
    if (status === "200") return accion === "add" ?
        "✅" : "✅";
    if (status === "403") return accion === "add" ?
        "⚠️ WhatsApp no permitió añadirlo directamente por privacidad o permisos. La persona podría necesitar una invitación." :
        "⚠️ WhatsApp rechazó la expulsión por permisos.";
    if (status === "404") return "❌ WhatsApp no encuentra el número o participante.";
    if (status === "409") return "⚠️ Conflicto 409 de WhatsApp: no se confirmó que el número entrara. Comprueba si ya está en el grupo o si hay una incorporación pendiente.";
    if (status === "408" || status === "429") return "⏳ WhatsApp limitó la solicitud. Inténtalo más tarde.";
    return "⚠️ WhatsApp devolvió el estado " + (status || "desconocido") + "; no se confirmó el cambio.";
}

async function administrarGrupo(sock, grupo, msg, comando, ahora = Date.now()) {
    if (!grupo?.endsWith("@g.us")) return "Solo funciona dentro de un grupo.";
    const metadata = await sock.groupMetadata(grupo);
    const autor = msg?.key?.participant || "";
    if (!localizarMiembro(metadata, autor)) return "Solo los integrantes del grupo pueden enviar solicitudes.";

    if (!botAdmin(metadata, sock)) return "🔒 Convierte a JABESHTBOT en administrador para gestionar integrantes.";
    const destino = objetivoComando(comando, msg);
    if (!destino) return comando.accion === "add" ?
        "Uso: *!añadir +51987654321* o *!añadir +34612345678* (incluye prefijo internacional)." :
        "Uso: *!quitar @persona*, *!quitar +51987654321* o responde a su mensaje con *!quitar*.";
    const miembro = localizarMiembro(metadata, destino);
    if (comando.accion === "remove") {
        if (!miembro) return "No encuentro ese número en el grupo. Es preferible mencionarlo o responder a su mensaje.";
        if (admin(miembro)) return "🔒 No se pueden expulsar administradores.";
        const proteccion = await evaluarProteccionGrupo(miembro, sock);
        if (proteccion) return mensajeProteccion(proteccion);
    } else if (miembro) return "ℹ️ Ese número ya está dentro del grupo.";

    if (!limitar(grupo, autor, ahora)) return "⏳ Límite de dos cambios cada 10 minutos por integrante.";
    if (comando.accion === "add") {
        let verificado;
        try {
            verificado = await comprobarNumeroWhatsApp(sock, destino);
        } catch (error) {
            console.warn("No se pudo verificar el número en WhatsApp:", error.message);
            return "⚠️ No pude comprobar si el número existe en WhatsApp. Intenta más tarde.";
        }
        if (!verificado) return "❌ Ese número no parece tener una cuenta de WhatsApp.";
        if (localizarMiembro(metadata, verificado)) return "ℹ️ Ese número ya está dentro del grupo.";
        const resultado = await sock.groupParticipantsUpdate(grupo, [verificado], "add");
        const status = String((Array.isArray(resultado) ? resultado[0] : resultado)?.status ?? "");
        if (status === "409") {
            // Conflicto no equivale a éxito. Reconsultar una vez por si otro
            // integrante lo añadió mientras se procesaba la solicitud.
            try {
                const actual = await sock.groupMetadata(grupo);
                if (localizarMiembro(actual, verificado) || localizarMiembro(actual, destino)) {
                    return "ℹ️ La persona ya figura dentro del grupo.";
                }
            } catch (error) {
                console.warn("No se pudo verificar el 409 con metadata:", error.message);
            }
        }
        return estadoWhatsApp(resultado, "add");
    }

    // !quitar se ejecuta inmediatamente a petición de cualquier integrante.
    // Ya se comprobaron permisos del bot, destinatario y cuentas protegidas.
    const resultado = await sock.groupParticipantsUpdate(grupo, [miembro.id], "remove");
    return estadoWhatsApp(resultado, "remove");
}

module.exports = { interpretarComandoGrupo, numeroInternacional, objetivoComando,
    administrarGrupo, botAdmin, admin, localizarMiembro, estadoWhatsApp, comprobarNumeroWhatsApp,
    telefonosProtegidos, evaluarProteccionGrupo };
