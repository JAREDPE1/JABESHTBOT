"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { iaActivaEnPrivado, configurarIaPrivado, cancelarSesionIaPrivado } = require("../lib/ai-private-controls");
const { debeResponderNatural } = require("../lib/ai-auto-reply");
const a = "51911111111@s.whatsapp.net";
const b = "999@lid";
test("IA activa por defecto; cada privado controla solo su chat", () => {
    const config = {};
    assert.equal(iaActivaEnPrivado(config, a), true);
    assert.equal(iaActivaEnPrivado(config, b), true);
    configurarIaPrivado(config, a, false);
    assert.equal(iaActivaEnPrivado(config, a), false);
    assert.equal(iaActivaEnPrivado(config, b), true);
    assert.equal(debeResponderNatural({ texto: "hola", jid: a, config }), false);
    assert.equal(debeResponderNatural({ texto: "hola", jid: b, config }), true);
    configurarIaPrivado(config, a, true);
    assert.equal(debeResponderNatural({ texto: "hola", jid: a, config }), true);
});
test("no permite cambiar un grupo con el control privado", () => {
    assert.throws(() => configurarIaPrivado({}, "123@g.us", false), /CHAT_PRIVADO_INVALIDO/);
});
test("cancelación de sesión evita que se entregue una respuesta posterior", () => {
    const actual = { ocupado: true, cancelado: false };
    const otras = { ocupado: true, cancelado: false };
    const conversaciones = new Map([[a, actual],[b, otras]]);
    assert.equal(cancelarSesionIaPrivado(conversaciones, a), true);
    assert.equal(actual.cancelado, true);
    assert.equal(conversaciones.has(a), false);
    assert.equal(otras.cancelado, false);
});
