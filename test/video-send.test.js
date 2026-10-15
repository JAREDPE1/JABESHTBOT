const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { enviarVideoConAlternativa, nombreVideoSeguro } = require("../lib/video-send");

function preparar(bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jabesht-enviar-"));
  const file = path.join(dir, "video.mp4");
  fs.writeFileSync(file, "prueba");
  fs.truncateSync(file, bytes);
  return { file, limpiar: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
test("nombre seguro de MP4", () => {
  assert.equal(nombreVideoSeguro('Hola: "Mundo"'), "Hola_ _Mundo_.mp4");
});
test("video pequeño se envía normal", async () => {
  const tmp = preparar(8 * 1024 * 1024);
  const enviados = [];
  try {
    const sock = { sendMessage: async (_jid, item) => { enviados.push(item); } };
    const r = await enviarVideoConAlternativa(sock, "chat", tmp.file, "prueba");
    assert.equal(r.modo, "video");
    assert.ok(enviados.some(x => x.video));
    assert.equal(enviados.some(x => x.document), false);
  } finally { tmp.limpiar(); }
});
test("video superior a 60MB avisa y envía documento", async () => {
  const tmp = preparar(61 * 1024 * 1024);
  const enviados = [];
  try {
    const sock = { sendMessage: async (_jid, item) => { enviados.push(item); } };
    const r = await enviarVideoConAlternativa(sock, "chat", tmp.file, "prueba");
    assert.equal(r.modo, "documento");
    assert.ok(enviados[0].text.includes("muy grande"));
    assert.equal(enviados[1].mimetype, "video/mp4");
    assert.ok(enviados[1].document);
  } finally { tmp.limpiar(); }
});
test("si falla video normal se reintenta como documento", async () => {
  const tmp = preparar(4 * 1024 * 1024);
  const enviados = [];
  try {
    const sock = { sendMessage: async (_jid, item) => {
      enviados.push(item);
      if (item.video) throw new Error("video falló");
    }};
    const r = await enviarVideoConAlternativa(sock, "chat", tmp.file, "prueba");
    assert.equal(r.modo, "documento");
    assert.ok(enviados.some(x => x.document));
  } finally { tmp.limpiar(); }
});
