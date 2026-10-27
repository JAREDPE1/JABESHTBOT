"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { enviarBotonesFormato } = require("../lib/formato-botones");
const { iniciarIndicadorDescarga } = require("../lib/download-status");

test("carátula, duración y dos botones en una única tarjeta", async () => {
    const envios = [];
    const sock = { user: { id: "bot@s.whatsapp.net" },
        waUploadToServer: async () => {},
        relayMessage: async (...args) => envios.push(args) };
    const baileys = {
        proto: { Message: { InteractiveMessage: { create: x => x } } },
        prepareWAMessageMedia: async () => ({ imageMessage: { mimetype: "image/jpeg" } }),
        generateWAMessageFromContent: (_jid, message) => ({ message, key: { id: "test" } }),
    };
    await enviarBotonesFormato(sock, "chat@s.whatsapp.net", {
        title: "J Balvin - Bobo", duracion: 305, token: "abc", thumbnailBuffer: Buffer.from("imagen"),
    }, baileys);
    assert.equal(envios.length, 1);
    const tarjeta = envios[0][1].interactiveMessage;
    assert.equal(tarjeta.header.hasMediaAttachment, true);
    assert.ok(tarjeta.header.imageMessage);
    assert.match(tarjeta.body.text, /5:05/);
    assert.equal(tarjeta.nativeFlowMessage.buttons.length, 2);
});

test("reacciona con reloj y finaliza con check al enviar GIF", async () => {
    const mensajes = [];
    const key = { id: "mensaje", remoteJid: "chat@s.whatsapp.net" };
    const sock = {
        sendMessage: async (_jid, contenido) => {
            mensajes.push(contenido);
            return { key: { id: "progreso", remoteJid: "chat@s.whatsapp.net", fromMe: true } };
        }
    };
    const fs = require("node:fs");
    const archivo = __filename;
    const terminar = await iniciarIndicadorDescarga(sock, "chat@s.whatsapp.net", key, "mp3", { archivoAnimacion: archivo });
    await terminar(true);
    assert.deepEqual(mensajes[0].react, { text: "🕒", key });
    assert.equal(mensajes[1].gifPlayback, true);
    assert.equal(mensajes[2].delete.id, "progreso");
    assert.deepEqual(mensajes[3].react, { text: "✅", key });
});
