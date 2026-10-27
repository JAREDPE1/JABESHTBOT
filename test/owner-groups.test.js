"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { esMensajeDelCreador, consultarGruposCreador, mensajesReporteGrupos } = require("../lib/owner-groups");
const OWNER = "51957211832";
const key = (remoteJid, rest = {}) => ({ remoteJid, fromMe: false, ...rest });

test("autoriza únicamente el número completo del creador en privado", async () => {
    assert.equal(await esMensajeDelCreador({}, key(OWNER + "@s.whatsapp.net"), OWNER), true);
    assert.equal(await esMensajeDelCreador({}, key("51911111111@s.whatsapp.net"), OWNER), false);
    assert.equal(await esMensajeDelCreador({}, key(OWNER + "@s.whatsapp.net", { fromMe: true }), OWNER), false);
    assert.equal(await esMensajeDelCreador({}, key("123@g.us"), OWNER), false);
});
test("resuelve LID mediante PN verificado y no confunde los dígitos del LID", async () => {
    const sock = { signalRepository: { lidMapping: { getPNForLID: async () => OWNER + "@s.whatsapp.net" } } };
    assert.equal(await esMensajeDelCreador(sock, key("999@lid"), OWNER), true);
    assert.equal(await esMensajeDelCreador({}, key("51957211832@lid"), OWNER), false);
    assert.equal(await esMensajeDelCreador({}, key("777@lid", { remoteJidAlt: OWNER + "@s.whatsapp.net" }), OWNER), true);
});
test("cuenta grupos y muestra sus nombres en privado", async () => {
    const sock = { groupFetchAllParticipating: async () => ({
        "a@g.us": { subject: "Familia" },
        "b@g.us": { subject: "Amigos" },
        "individual@s.whatsapp.net": { subject: "No es un grupo" }
    }) };
    const r = await consultarGruposCreador(sock, key(OWNER + "@s.whatsapp.net"), OWNER);
    assert.deepEqual(r, { estado: "ok", cantidad: 2, nombres: ["Amigos", "Familia"] });
    assert.deepEqual(mensajesReporteGrupos(r), [
        "🤖 *JABESHTBOT*\n👥 Estoy en *2* grupos de WhatsApp.\n\n📋 *Nombres de los grupos:*\n1. Amigos\n2. Familia"
    ]);
});

test("divide una lista larga en mensajes y sanea saltos de línea", () => {
    const nombres = Array.from({ length: 80 }, (_, i) => "Grupo " + i + " grande".repeat(4));
    nombres[0] = "Hola\nOtro nombre";
    const mensajes = mensajesReporteGrupos({ estado: "ok", nombres }, 320);
    assert.ok(mensajes.length > 1);
    assert.ok(mensajes.every(m => m.length <= 320));
    assert.ok(mensajes.join(" ").includes("Hola Otro nombre"));
    assert.match(mensajes.at(-1), /80\\. Grupo 79/);
});
test("los terceros no pueden invocar groupFetchAllParticipating", async () => {
    let consultas = 0;
    const sock = { groupFetchAllParticipating: async () => { consultas++; return {}; } };
    assert.deepEqual(await consultarGruposCreador(sock, key("51900000000@s.whatsapp.net"), OWNER), { estado: "no_autorizado" });
    assert.deepEqual(await consultarGruposCreador(sock, key("123@g.us"), OWNER), { estado: "solo_privado" });
    assert.equal(consultas, 0);
});
