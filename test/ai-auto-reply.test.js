const test = require("node:test");
const assert = require("node:assert/strict");
const { debeResponderNatural } = require("../lib/ai-auto-reply");
const privado = "51999999999@s.whatsapp.net";
const privadoLid = "123456@lid";
const grupo = "120363123@g.us";

test("IA privada responde de inmediato sin Hola IA", () => {
  for (const texto of ["hola", "Qué es la luna?", "Hazme un resumen en Word", "créame un hombre en la Luna", "quiero descargar música"]) {
    assert.equal(debeResponderNatural({texto, jid: privado, config: {}}), true, texto);
  }
  assert.equal(debeResponderNatural({texto: "qué tal", jid: privadoLid, config: {}}), true);
});
test("los comandos explícitos no son interceptados por la IA", () => {
  for (const texto of ["!placa ABC123", "!play música", "!menu", "!activaria", "!desactivaria", ".creador"]) {
    assert.equal(debeResponderNatural({texto, jid: privado, config: {}}), false, texto);
  }
});
test("los grupos requieren !activaria y el flujo MP3/MP4 tiene prioridad", () => {
  assert.equal(debeResponderNatural({texto: "hola", jid: grupo, config: {}}), false);
  assert.equal(debeResponderNatural({texto: "hola", jid: grupo, config: {iaConversacionGrupos: {[grupo]: true}}}), true);
  assert.equal(debeResponderNatural({texto: "1", jid: grupo, config: {iaConversacionGrupos: {[grupo]: true}}, sesionDescargaActiva: true}), false);
  assert.equal(debeResponderNatural({texto: "hola", jid: "status@broadcast", config: {}}), false);
});
