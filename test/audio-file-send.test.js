"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { informacionArchivoAudio, enviarAudioParaGuardar } = require("../lib/audio-file-send");

test("nombre limpio y formato real de audio", () => {
    assert.deepEqual(informacionArchivoAudio('Tema: "mi canción" / versión?', ".mp3"), {
        mimetype: "audio/mpeg",
        fileName: "Tema mi canción versión.mp3",
    });
    assert.equal(informacionArchivoAudio("Tema", ".m4a").mimetype, "audio/mp4");
    assert.throws(() => informacionArchivoAudio("Tema", ".exe"), /no soportado/);
});

test("envía reproductor y archivo descargable sin reconvertir", async () => {
    const mensajes = [];
    const sock = { sendMessage: async (_jid, mensaje) => { mensajes.push(mensaje); } };
    const contenido = Buffer.from("audio");
    const resultado = await enviarAudioParaGuardar(sock, "test@s.whatsapp.net", { contenido, titulo: "Canción", extension: ".mp3" });
    assert.equal(mensajes.length, 2);
    assert.equal(mensajes[0].audio, contenido);
    assert.equal(mensajes[1].document, contenido);
    assert.equal(mensajes[1].fileName, "Canción.mp3");
    assert.equal(resultado.archivoAdjunto, true);
});

test("falla de documento no invalida audio ya enviado", async () => {
    let intentos = 0;
    const sock = { sendMessage: async () => {
        intentos++;
        if (intentos === 2) throw new Error("Documento rechazado");
    }};
    const resultado = await enviarAudioParaGuardar(sock, "test@s.whatsapp.net", {
        contenido: Buffer.from("audio"), titulo: "Prueba", extension: ".mp3"
    });
    assert.equal(resultado.archivoAdjunto, false);
    assert.match(resultado.errorArchivo.message, /rechazado/);
});
