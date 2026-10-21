const test = require("node:test");
const assert = require("node:assert/strict");
const {evaluarProteccionGrupo, telefonosProtegidos} = require("../lib/group-member-requests");
test("bloquea expulsar cuenta del bot",async()=>{
  const sock={user:{id:"51911111111:4@s.whatsapp.net"}};
  assert.equal(await evaluarProteccionGrupo({id:"51911111111@s.whatsapp.net"},sock,{}),"protegido");
});
test("bloquea número configurado sin exponer valores reales",async()=>{
  const env={GROUP_PROTECTED_NUMBERS:"51922222222"};
  assert.equal(await evaluarProteccionGrupo({id:"51922222222@s.whatsapp.net"}, {user:{id:"51911111111@s.whatsapp.net"}},env),"protegido");
});
test("bloquea LID configurado",async()=>{
  const env={GROUP_PROTECTED_JIDS:"123456789@lid"};
  assert.equal(await evaluarProteccionGrupo({id:"123456789@lid"}, {user:{id:"51911111111@s.whatsapp.net"}},env),"protegido");
});
test("identificador LID sin resolver no autoriza expulsión si hay cuentas protegidas",async()=>{
  const env={GROUP_PROTECTED_NUMBERS:"51922222222"};
  assert.equal(await evaluarProteccionGrupo({id:"123456789@lid"}, {user:{id:"51911111111@s.whatsapp.net"}},env),"sin_verificar");
});
test("otras cuentas pueden expulsarse",async()=>{
  const env={GROUP_PROTECTED_NUMBERS:"51922222222"};
  assert.equal(await evaluarProteccionGrupo({id:"51933333333@s.whatsapp.net"}, {user:{id:"51911111111@s.whatsapp.net"}},env),null);
  assert.deepEqual([...telefonosProtegidos(env)],["51922222222"]);
});