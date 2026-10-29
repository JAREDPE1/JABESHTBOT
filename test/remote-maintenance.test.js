"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
    habilitado, idPm2, comprobarAcceso, mensajeEstado, estadoOcupado
} = require("../lib/remote-maintenance");
const owner = "51957211832";
test("mantenimiento remoto está deshabilitado por defecto", () => {
    assert.equal(habilitado({}), false);
    assert.equal(habilitado({ BOT_REMOTE_ADMIN_ENABLED: "true" }), true);
    assert.equal(idPm2({ pm_id: "7" }), "7");
    assert.equal(idPm2({ pm_id: "JABESHTBOT; rm -rf /" }), null);
    assert.equal(idPm2({}), null);
});
test("únicamente el propietario verifica comando por privado", async () => {
    assert.equal(await comprobarAcceso({}, { remoteJid: owner + "@s.whatsapp.net", fromMe: false }, { BOT_OWNER_NUMBER: owner }), "ok");
    assert.equal(await comprobarAcceso({}, { remoteJid: "51900000000@s.whatsapp.net", fromMe: false }, { BOT_OWNER_NUMBER: owner }), "no_autorizado");
    assert.equal(await comprobarAcceso({}, { remoteJid: "grupo@g.us", fromMe: false }, { BOT_OWNER_NUMBER: owner }), "solo_privado");
});
test("estado persistido muestra la última operación y errores", () => {
    assert.equal(estadoOcupado({ estado: "ejecutando", fecha: new Date().toISOString() }), true);
    assert.equal(estadoOcupado({ estado: "actualizado", fecha: new Date().toISOString() }), false);
    assert.match(mensajeEstado({ accion: "actualizar", estado: "error", detalle: "Error al actualizar" }), /Error al actualizar/);
});
