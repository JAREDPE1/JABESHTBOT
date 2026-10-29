"use strict";
// Proceso separado de WhatsApp: permite reiniciar el proceso PM2 sin matarse
// antes de terminar git/npm. No acepta comandos de usuario ni shell.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const DATA = path.resolve(process.env.BOT_MAINTENANCE_DATA_DIR || process.env.DATA_DIR || ROOT);
const STATUS = path.join(DATA, "remote-maintenance-status.json");
const [action, pmId] = process.argv.slice(2);
function status(estado, detalle) {
    fs.mkdirSync(DATA, { recursive: true });
    const dest = STATUS + ".worker.tmp";
    fs.writeFileSync(dest, JSON.stringify({ accion: action, estado, detalle, fecha: new Date().toISOString() }, null, 2), { mode: 0o600 });
    fs.renameSync(dest, STATUS);
}
function run(bin, args, ms = 120000) {
    return new Promise((resolve, reject) => {
        const p = spawn(bin, args, { cwd: ROOT, shell: false, stdio: ["ignore", "pipe", "pipe"] });
        let stderr = "";
        const timer = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("Tiempo agotado: " + bin)); }, ms);
        p.stderr.on("data", d => { stderr = (stderr + d.toString()).slice(-1200); });
        p.on("error", e => { clearTimeout(timer); reject(e); });
        p.on("close", code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(bin + " (" + code + "): " + stderr.slice(-280))); });
    });
}
async function git(args) {
    return new Promise((resolve, reject) => {
        const p = spawn("git", args, { cwd: ROOT, shell: false, stdio: ["ignore", "pipe", "pipe"] });
        let out = "", err = "";
        const timeout = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("Git agotó tiempo")); }, 120000);
        p.stdout.on("data", d => { out += d.toString(); });
        p.stderr.on("data", d => { err += d.toString().slice(-200); });
        p.on("error", e => { clearTimeout(timeout); reject(e); });
        p.on("close", code => { clearTimeout(timeout); code === 0 ? resolve(out.trim()) : reject(new Error(err.slice(-250) || "Git falló")); });
    });
}
async function main() {
    if (process.platform !== "linux" || !["actualizar", "reiniciar"].includes(action) || !/^\d{1,6}$/.test(pmId || "")) throw new Error("Argumentos no permitidos");
    // Dar tiempo al bot a enviar la confirmación a WhatsApp antes de reiniciar.
    await new Promise(resolve => setTimeout(resolve, 3000));
    status("ejecutando", "Comprobando proceso PM2.");
    if (action === "actualizar") {
        const branch = await git(["branch", "--show-current"]);
        if (branch !== "main") throw new Error("Solo se actualiza la rama main.");
        const origin = await git(["remote", "get-url", "origin"]);
        if (!/^(https:\/\/github\.com\/JAREDPE1\/JABESHTBOT(?:\.git)?|git@github\.com:JAREDPE1\/JABESHTBOT(?:\.git)?)$/.test(origin)) throw new Error("El origin no coincide con el repositorio autorizado.");
        const dirty = await git(["status", "--porcelain", "--untracked-files=no"]);
        if (dirty) throw new Error("Hay cambios locales; realiza respaldo/revisión manual antes de actualizar.");
        const before = await git(["rev-parse", "HEAD"]);
        await run("git", ["fetch", "--no-tags", "origin", "main"]);
        const remote = await git(["rev-parse", "FETCH_HEAD"]);
        if (before === remote) { status("sin_cambios", "Ya tienes la última versión de main."); return; }
        await run("git", ["merge-base", "--is-ancestor", before, remote]);
        await run("git", ["merge", "--ff-only", remote]);
        if (fs.existsSync(path.join(ROOT, "package-lock.json"))) await run("npm", ["ci", "--ignore-scripts", "--no-audit"], 240000);
        else await run("npm", ["install", "--ignore-scripts", "--no-audit"], 240000);
        await run(process.execPath, ["--check", "index.js"], 30000);
        status("reiniciando", "Código actualizado. Reiniciando PM2…");
    } else status("reiniciando", "Reinicio solicitado desde WhatsApp.");
    await run("pm2", ["restart", pmId], 120000);
    status(action === "actualizar" ? "actualizado" : "reiniciado", action === "actualizar" ? "Nueva versión aplicada y PM2 reiniciado." : "PM2 reiniciado.");
}
main().catch(e => { status("error", String(e.message || e).slice(0, 400)); process.exitCode = 1; });
