const test = require("node:test");
const assert = require("node:assert/strict");
const { comprobarNumeroWhatsApp, estadoWhatsApp, numeroInternacional } = require("../lib/group-member-requests");
test("se comprueba registro con onWhatsApp antes de añadir", async () => {
 const sock = { onWhatsApp: async () => [{ exists:true, jid:"51987654321@s.whatsapp.net" }] };
 assert.equal(await comprobarNumeroWhatsApp(sock,"51987654321@s.whatsapp.net"),"51987654321@s.whatsapp.net");
});
test("número no registrado no debe añadirse", async () => {
 assert.equal(await comprobarNumeroWhatsApp({onWhatsApp:async()=>[{exists:false}]},"51987654321@s.whatsapp.net"),null);
});
test("409 no se interpreta como éxito", () => {
 assert.match(estadoWhatsApp([{status:409}],"add"),/409/);
 assert.equal(estadoWhatsApp([{status:200}],"add"),"✅");
});
test("Perú e internacionales", () => {
 assert.equal(numeroInternacional("987654321"),"51987654321");
 assert.equal(numeroInternacional("+34612345678"),"34612345678");
});
