"use strict";
const { randomUUID } = require("node:crypto");
const { obtenerSecciones, obtenerSeccion, textoCategorias, textoSeccion, botMenuText } = require("./menu");

const sesionesMenu = new Map();
const TIEMPO_MENU_MS = 3 * 60_000;

function nodosInteractividad(jid) {
    const biz = {tag:"biz",attrs:{actual_actors:"2",host_storage:"2",
        privacy_mode_ts:String(Math.floor(Date.now()/1000)-77980457)},
        content:[{tag:"interactive",attrs:{type:"native_flow",v:"1"},
            content:[{tag:"native_flow",attrs:{v:"9",name:"mixed"}}]},
            {tag:"quality_control",attrs:{source_type:"third_party"}}]};
    return jid.endsWith("@g.us")?[biz]:[{tag:"bot",attrs:{biz_bot:"1"}},biz];
}
async function boton(sock,jid,{texto,etiqueta,id},baileys=require("@whiskeysockets/baileys")) {
    const {proto,generateWAMessageFromContent}=baileys;
    const contenido=proto.Message.InteractiveMessage.create({
        header:{title:"JABESHTBOT",hasMediaAttachment:false},
        body:{text:texto},footer:{text:"JABESHTBOT • Menú por categorías"},
        nativeFlowMessage:{buttons:[{name:"quick_reply",buttonParamsJson:JSON.stringify({display_text:etiqueta,id})}],
            messageParamsJson:"{}",messageVersion:1}
    });
    const mensaje=generateWAMessageFromContent(jid,{interactiveMessage:contenido},{userJid:sock.user?.id});
    await sock.relayMessage(jid,mensaje.message,{messageId:mensaje.key.id,additionalNodes:nodosInteractividad(jid)});
}
async function abrirMenu(sock,jid,{creador=false}={}) {
    const token=randomUUID().slice(0,12);
    const sesion={token,creador,etapa:"inicio",expira:Date.now()+TIEMPO_MENU_MS};
    sesionesMenu.set(jid,sesion);
    try {
        await boton(sock,jid,{texto:botMenuText,etiqueta:"📚 Ver comandos",id:"menu_abrir_"+token});
    } catch(err) {
        console.warn("Botón de menú no disponible:",err.message);
        sesion.etapa="categorias";
        await sock.sendMessage(jid,{text:textoCategorias({creador})});
    }
    return sesion;
}
async function abrirMenuTexto(sock,jid,creador=false) {
    const token=randomUUID().slice(0,12);
    sesionesMenu.set(jid,{token,creador,etapa:"categorias",expira:Date.now()+TIEMPO_MENU_MS});
    await sock.sendMessage(jid,{text:textoCategorias({creador})});
}

async function enviarCategorias(sock,jid,sesion) {
    sesion.etapa="categorias";
    sesion.expira=Date.now()+TIEMPO_MENU_MS;
    const lista=obtenerSecciones({creador:sesion.creador});
    const filas=lista.map((x,i)=>({header:"",title:x.titulo,description:x.descripcion,
        id:"menu_seccion_"+x.id+"_"+sesion.token}));
    try {
        // Botón de lista: evita el límite visual de decenas de quick replies.
        await botonLista(sock,jid,{texto:"📚 *Elige una categoría*\n\nAbre la lista y selecciona qué comandos quieres ver.",
            token:sesion.token,filas});
    } catch(err) {
        console.warn("Lista de categorías no disponible:",err.message);
        await sock.sendMessage(jid,{text:textoCategorias({creador:sesion.creador})});
    }
}
async function botonLista(sock,jid,{texto,token,filas},baileys=require("@whiskeysockets/baileys")) {
    const {proto,generateWAMessageFromContent}=baileys;
    const secciones=[{title:"Categorías de comandos",rows:filas}];
    const content=proto.Message.InteractiveMessage.create({
        header:{title:"JABESHTBOT",hasMediaAttachment:false},
        body:{text:texto},footer:{text:"Selecciona una categoría"},
        nativeFlowMessage:{buttons:[{name:"single_select",buttonParamsJson:JSON.stringify({
            title:"📂 Elegir sección",sections:secciones})}],messageParamsJson:"{}",messageVersion:1}
    });
    const mensaje=generateWAMessageFromContent(jid,{interactiveMessage:content},{userJid:sock.user?.id});
    await sock.relayMessage(jid,mensaje.message,{messageId:mensaje.key.id,additionalNodes:nodosInteractividad(jid)});
}
async function mostrarSeccion(sock,jid,sesion,id) {
    const texto=textoSeccion(id,{creador:sesion.creador});
    if(!texto) return false;
    sesion.etapa="seccion";sesion.expira=Date.now()+TIEMPO_MENU_MS;
    try {await boton(sock,jid,{texto,etiqueta:"📚 Otras secciones",id:"menu_volver_"+sesion.token});}
    catch(err) {
        console.warn("Botón volver no disponible:",err.message);
        await sock.sendMessage(jid,{text:texto+"\nResponde *0* para volver a las categorías."});
    }
    return true;
}
async function procesarMenu(sock,jid,{texto="",botonId=""}={}) {
    const sesion=sesionesMenu.get(jid);
    const esMenuId=botonId.startsWith("menu_");
    if(!sesion || sesion.expira<Date.now()) {
        if(sesion) sesionesMenu.delete(jid);
        if(esMenuId) {
            await sock.sendMessage(jid,{text:"⌛ Este menú venció. Escribe *!menu* para abrir otro."});
            return true;
        }
        return false;
    }
    if(botonId && !esMenuId) return false;
    const t=texto.trim().toLowerCase();
    if(t==="!menu" || t==="!ayuda" || t==="!start") return false;
    if(esMenuId) {
        if(botonId==="menu_abrir_"+sesion.token || botonId==="menu_volver_"+sesion.token) {
            await enviarCategorias(sock,jid,sesion);return true;
        }
        const pref="menu_seccion_",post="_"+sesion.token;
        if(botonId.startsWith(pref)&&botonId.endsWith(post)) {
            const id=botonId.slice(pref.length,-post.length);
            if(obtenerSeccion(id,{creador:sesion.creador})) return mostrarSeccion(sock,jid,sesion,id);
        }
        // Las respuestas obsoletas no ejecutan comandos.
        return true;
    }
    // Los números sólo se interpretan cuando el menú ya está abierto.
    if(sesion.etapa==="categorias"&&/^\d{1,2}$/.test(t)){
        const n=Number(t),sec=obtenerSecciones({creador:sesion.creador})[n-1];
        if(sec){await mostrarSeccion(sock,jid,sesion,sec.id);return true;}
    }
    if(sesion.etapa==="seccion"&&t==="0"){await enviarCategorias(sock,jid,sesion);return true;}
    if(t && !/^\\d+$/.test(t)) sesionesMenu.delete(jid);
    return false;
}
module.exports={abrirMenu,abrirMenuTexto,procesarMenu,enviarCategorias,mostrarSeccion,botonLista,boton,sesionesMenu};
