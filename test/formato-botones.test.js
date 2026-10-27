"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { extraerIdBoton, interpretarFormato, enviarBotonesFormato } = require("../lib/formato-botones");

test("lee respuestas quick_reply y botones anteriores", () => {
    assert.equal(extraerIdBoton({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{"id":"formato_mp3_abc"}' } } }), "formato_mp3_abc");
    assert.equal(extraerIdBoton({ ephemeralMessage: { message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{"id":"formato_mp4_abc"}' } } } } }), "formato_mp4_abc");
    assert.equal(extraerIdBoton({ buttonsResponseMessage: { selectedButtonId: "formato_mp3_abc" } }), "formato_mp3_abc");
    assert.equal(extraerIdBoton({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: "{" } } }), "");
});

test("acepta el botón de la sesión y la selección escrita", () => {
    assert.equal(interpretarFormato("formato_mp3_abc", "abc"), "mp3");
    assert.equal(interpretarFormato("formato_mp4_abc", "abc"), "mp4");
    assert.equal(interpretarFormato("formato_mp3_antiguo", "abc"), null);
    assert.equal(interpretarFormato("1", "abc"), "mp3");
    assert.equal(interpretarFormato("video", "abc"), "mp4");
});

test("envía exactamente dos botones interactivos", async () => {
    let enviado;
    const sock = { user: { id: "bot@s.whatsapp.net" }, relayMessage: async (...args) => { enviado = args; } };
    const baileys = {
        proto: { Message: { InteractiveMessage: { create: x => x } } },
        generateWAMessageFromContent: (_jid, message) => ({ message, key: { id: "id" } })
    };
    await enviarBotonesFormato(sock, "test@s.whatsapp.net", { title: "Prueba", duracion: 135, token: "abc" }, baileys);
    assert.equal(enviado[0], "test@s.whatsapp.net");
    const mensaje = enviado[1].interactiveMessage;
    assert.match(mensaje.body.text, /2:15/);
    assert.deepEqual(mensaje.nativeFlowMessage.buttons.map(b => JSON.parse(b.buttonParamsJson).id), ["formato_mp3_abc", "formato_mp4_abc"]);
    assert.equal(enviado[2].additionalNodes[0].tag, "bot");
});
