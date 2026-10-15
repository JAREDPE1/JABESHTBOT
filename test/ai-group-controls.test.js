const test = require("node:test");
const assert = require("node:assert/strict");
const {iaActivaEnGrupo, configurarIaGrupo, esAdministradorGrupo, cancelarSesionesIaGrupo} = require("../lib/ai-group-controls");

const grupo = "grupo@g.us";
test("IA natural apagada por defecto y persiste en config", () => {
 const config = {};
 assert.equal(iaActivaEnGrupo(config,grupo),false);
 configurarIaGrupo(config,grupo,true);
 assert.equal(iaActivaEnGrupo(config,grupo),true);
 configurarIaGrupo(config,grupo,false);
 assert.equal(iaActivaEnGrupo(config,grupo),false);
});
test("solo administradores y superadministradores pueden cambiarla", () => {
 const metadata = {participants:[{id:"1@s.whatsapp.net",admin:"admin"},{id:"2@s.whatsapp.net",admin:"superadmin"},{id:"3@s.whatsapp.net",admin:null}]};
 assert.equal(esAdministradorGrupo(metadata,"1@s.whatsapp.net"),true);
 assert.equal(esAdministradorGrupo(metadata,"2@s.whatsapp.net"),true);
 assert.equal(esAdministradorGrupo(metadata,"3@s.whatsapp.net"),false);
 assert.equal(esAdministradorGrupo(metadata,"4@s.whatsapp.net"),false);
});
test("apagar grupo cancela sesiones sin afectar otros grupos", () => {
 const sesiones = new Map([[grupo+":1",{cancelado:false}],["otro@g.us:1",{cancelado:false}]]);
 assert.equal(cancelarSesionesIaGrupo(sesiones,grupo),1);
 assert.equal(sesiones.size,1);
 assert.ok(sesiones.has("otro@g.us:1"));
});
