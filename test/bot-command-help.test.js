const test = require("node:test");
const assert = require("node:assert/strict");
const { detectarAyudaComando } = require("../lib/bot-command-help");

test("música explica !play y MP3", () => {
 const r = detectarAyudaComando("quiero descargar música");
 assert.match(r,/!play/);
 assert.match(r,/MP3/);
});
test("videos explica comandos correctos", () => {
 assert.match(detectarAyudaComando("cómo descargo un video de TikTok"),/!tiktok/);
 assert.match(detectarAyudaComando("quiero bajar un video de YouTube"),/!yt/);
});
test("sticker y placas dan instrucciones", () => {
 assert.match(detectarAyudaComando("cómo hacer stickers"),/!s/);
 assert.match(detectarAyudaComando("cómo consultar una placa"),/!placa/);
});
test("ayuda para documentos y menú", () => {
 assert.match(detectarAyudaComando("cómo crear un resumen word"),/!resumen/);
 assert.match(detectarAyudaComando("qué comandos tienes"),/!menu/);
});
test("no responde a comandos ni a conversaciones ordinarias", () => {
 assert.equal(detectarAyudaComando("!placa ABC123"),null);
 assert.equal(detectarAyudaComando("!play musica"),null);
 assert.equal(detectarAyudaComando("hola, qué tal"),null);
 assert.equal(detectarAyudaComando("escuché una canción bonita"),null);
});
