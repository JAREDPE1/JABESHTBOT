const test = require("node:test");
const assert = require("node:assert/strict");
const { crearIndicadorEscritura } = require("../lib/typing-presence");

test("muestra escribiendo y luego lo detiene al responder", async () => {
  const eventos = [];
  const sock = { sendPresenceUpdate: async (tipo, jid) => eventos.push({ tipo, jid }) };
  const indicador = crearIndicadorEscritura({ intervaloMs: 1000 });
  assert.equal(await indicador.ejecutar(sock, "chat@s.whatsapp.net", async () => "respuesta"), "respuesta");
  assert.deepEqual(eventos.map(e => e.tipo), ["composing", "paused"]);
});
test("si la IA falla también oculta escribiendo", async () => {
  const eventos = [];
  const sock = { sendPresenceUpdate: async tipo => eventos.push(tipo) };
  await assert.rejects(crearIndicadorEscritura().ejecutar(sock, "chat@s.whatsapp.net", async () => {throw new Error("error API")}));
  assert.deepEqual(eventos, ["composing", "paused"]);
});
test("varias respuestas simultáneas en un grupo no apagan la presencia prematuramente", async () => {
  const eventos = [];
  const sock = { sendPresenceUpdate: async tipo => eventos.push(tipo) };
  const indicador = crearIndicadorEscritura();
  let desbloquear;
  const bloqueado = new Promise(resolve => {desbloquear = resolve});
  const primera = indicador.ejecutar(sock, "grupo@g.us", async () => {await bloqueado});
  const segunda = indicador.ejecutar(sock, "grupo@g.us", async () => "segunda");
  await segunda;
  assert.equal(eventos.includes("paused"), false);
  desbloquear();
  await primera;
  assert.deepEqual(eventos, ["composing", "paused"]);
});
test("si WhatsApp rechaza la presencia el mensaje sigue funcionando", async () => {
  const sock = { sendPresenceUpdate: async () => { throw new Error("presencia no disponible") } };
  const resultado = await crearIndicadorEscritura().ejecutar(sock, "chat@s.whatsapp.net", async () => "ok");
  assert.equal(resultado, "ok");
});
