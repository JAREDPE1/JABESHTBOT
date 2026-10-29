"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { esMensajeDelCreador, esChatPrivado } = require("./owner-groups");

const RAIZ = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(process.env.DATA_DIR || RAIZ);
const ESTADO = path.join(DATA_DIR, "remote-maintenance-status.json");
const SCRIPT = path.join(RAIZ, "scripts", "remote-maintenance-worker.js");

function habilitado(env = process.env) {
    return env.BOT_REMOTE_ADMIN_ENABLED === "true";
}

function idPm2(env = process.env) {
    // PM2 proporciona pm_id al ejecutar Node. Evitar reiniciar por nombre
    // ambiguo o mediante argumentos arbitrarios enviados por WhatsApp.
    const valor = String(env.pm_id ?? "");
    return /^\d{1,6}$/.test(valor) ? valor : null;
}

async function comprobarAcceso(sock, key, env = process.env) {
    if (!esChatPrivado(key?.remoteJid)) return "solo_privado";
    if (!(await esMensajeDelCreador(sock, key, env.BOT_OWNER_NUMBER || undefined))) return "no_autorizado";
    return "ok";
}

function leerEstado() {
    try {
        const data = JSON.parse(fs.readFileSync(ESTADO, "utf8"));
        if (!data || typeof data !== "object") return null;
        return data;
    } catch {
        return null;
    }
}

function guardarEstado(datos) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const temporal = ESTADO + "." + process.pid + ".tmp";
    fs.writeFileSync(temporal, JSON.stringify({ ...datos, fecha: new Date().toISOString() }, null, 2), { mode: 0o600 });
    fs.renameSync(temporal, ESTADO);
}

function estadoOcupado(estado) {
    if (!estado || !["pendiente", "ejecutando", "reiniciando"].includes(estado.estado)) return false;
    const fecha = Date.parse(estado.fecha);
    return Number.isFinite(fecha) && Date.now() - fecha < 12 * 60_000;
}

function iniciarOperacion(tipo, env = process.env) {
    if (!["actualizar", "reiniciar"].includes(tipo)) throw new Error("OPERACION_INVALIDA");
    if (!habilitado(env)) throw new Error("ADMIN_REMOTO_DESACTIVADO");
    if (process.platform !== "linux") throw new Error("SOLO_LINUX");
    const pm2 = idPm2(env);
    if (!pm2) throw new Error("NO_EJECUTADO_CON_PM2");
    if (estadoOcupado(leerEstado())) throw new Error("MANTENIMIENTO_EN_PROCESO");
    if (!fs.existsSync(SCRIPT)) throw new Error("WORKER_NO_ENCONTRADO");

    guardarEstado({ estado: "pendiente", accion: tipo, detalle: "Solicitud recibida por WhatsApp." });
    let hijo;
    try {
        hijo = spawn(process.execPath, [SCRIPT, tipo, pm2], {
            cwd: RAIZ,
            detached: true,
            stdio: "ignore",
            env: { ...env, BOT_MAINTENANCE_DATA_DIR: DATA_DIR },
        });
    } catch (error) {
        guardarEstado({ estado: "error", accion: tipo, detalle: "No se pudo iniciar el mantenimiento." });
        throw error;
    }
    hijo.on("error", error => {
        console.error("Mantenimiento remoto:", error.message);
        try { guardarEstado({ estado: "error", accion: tipo, detalle: "No se pudo iniciar el proceso de mantenimiento." }); }
        catch {}
    });
    hijo.unref();
    return { accion: tipo, pid: hijo.pid };
}

function mensajeEstado(estado) {
    if (!estado) return "ℹ️ Todavía no hay operaciones de mantenimiento registradas.";
    const etiquetas = {
        pendiente: "⏳ Pendiente", ejecutando: "🔄 Ejecutando",
        reiniciando: "♻️ Reiniciando", actualizado: "✅ Actualizado",
        reiniciado: "✅ Reinicio solicitado", sin_cambios: "✅ Sin cambios",
        error: "❌ Error",
    };
    const detalle = String(estado.detalle || "").slice(0, 500);
    return "*🛠️ Mantenimiento de JABESHTBOT*\n" +
        "Acción: *" + (estado.accion === "actualizar" ? "Actualizar" : "Reiniciar") + "*\n" +
        "Estado: " + (etiquetas[estado.estado] || "Desconocido") +
        (detalle ? "\n" + detalle : "") +
        (estado.fecha ? "\nÚltimo registro: " + estado.fecha : "");
}

module.exports = { habilitado, idPm2, comprobarAcceso, leerEstado, guardarEstado,
    iniciarOperacion, mensajeEstado, estadoOcupado, ESTADO };
