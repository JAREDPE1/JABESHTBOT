"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const { obtenerSecciones, obtenerSeccion, textoSeccion, textoCategorias }=require("../menu/menu");
const { abrirMenu, abrirMenuTexto, procesarMenu, sesionesMenu }=require("../menu/menu-interactivo");

test("organiza comandos por secciones sin exponer administración al público",()=>{
    const publicas=obtenerSecciones();
    assert.ok(publicas.length>=6);
    assert.equal(obtenerSeccion("administracion"),null);
    assert.ok(obtenerSeccion("administracion",{creador:true}));
    assert.match(textoSeccion("documentos"),/!resumen-pptx/);
    assert.match(textoSeccion("descargas"),/!play/);
    assert.match(textoSeccion("avisos"),/!activaryoutube/);
    assert.doesNotMatch(textoCategorias(),/Administración/);
});

test("menú de respaldo permite navegar por números y volver con 0",async()=>{
    const mensajes=[];
    const sock={sendMessage:async(jid,obj)=>mensajes.push(obj.text)};
    const jid="prueba@s.whatsapp.net";
    await abrirMenuTexto(sock,jid,false);
    assert.match(mensajes[0],/MÚ|Música/i);
    assert.equal(await procesarMenu(sock,jid,{texto:"1"}),true);
    assert.match(mensajes[1],/!play/);
    assert.equal(await procesarMenu(sock,jid,{texto:"0"}),true);
    assert.match(mensajes[2],/MENÚ/);
    sesionesMenu.delete(jid);
});

test("menú interactivo incluye botón de abrir y rechaza selecciones obsoletas",async()=>{
    const jid="otro@s.whatsapp.net", messages=[];
    const sock={user:{id:"bot@s.whatsapp.net"},relayMessage:async(jid,msg)=>messages.push(msg),
        sendMessage:async(jid,msg)=>messages.push(msg)};
    // No dispone de la dependencia Baileys en este mock; abrirMenu usa
    // el fallback textual sin perder la sesión.
    await abrirMenu(sock,jid);
    assert.equal(sesionesMenu.get(jid).etapa,"categorias");
    assert.equal(await procesarMenu(sock,jid,{botonId:"menu_seccion_administracion_invalido"}),true);
    assert.equal(await procesarMenu(sock,jid,{texto:"1"}),true);
    assert.ok(messages.some(m=>typeof m.text==="string"&&m.text.includes("!play")));
    sesionesMenu.delete(jid);
});
