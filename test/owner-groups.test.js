"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { esMensajeDelCreador, consultarGruposCreador, mensajeCantidadGrupos } = require("../lib/owner-groups");
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
test("cuenta todos los grupos actuales de la cuenta sin exponer sus nombres", async () => {
    const sock = { groupFetchAllParticipating: async () => ({
        "a@g.us": { subject: "Privado" }, "b@g.us": { subject: "Secreto" }
    }) };
    const r = await consultarGruposCreador(sock, key(OWNER + "@s.whatsapp.net"), OWNER);
    assert.deepEqual(r, { estado: "ok", cantidad: 2 });
    assert.match(mensajeCantidadGrupos(r.cantidad), /2.*grupos/);
    assert.ok(!mensajeCantidadGrupos(r.cantidad).includes("Secreto"));
});
test("los terceros no pueden invocar groupFetchAllParticipating", async () => {
    let consultas = 0;
    const sock = { groupFetchAllParticipating: async () => { consultas++; return {}; } };
    assert.deepEqual(await consultarGruposCreador(sock, key("51900000000@s.whatsapp.net"), OWNER), { estado: "no_autorizado" });
    assert.deepEqual(await consultarGruposCreador(sock, key("123@g.us"), OWNER), { estado: "solo_privado" });
    assert.equal(consultas, 0);
});
