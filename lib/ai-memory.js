"use strict";
const fs=require("fs"),path=require("path");
function crearMemoria(dir) {
 const file=path.join(dir,"ia-memory.json");
 function leer(){try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return {}}}
 function guardar(db){fs.mkdirSync(dir,{recursive:true});const tmp=file+".tmp";fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,file)}
 function listar(id){return (leer()[id]||[]).slice(0,10)}
 function anotar(id,nota){const limpio=String(nota||"").trim().slice(0,300);if(!limpio)return false;const db=leer();db[id]=(db[id]||[]).slice(-9);db[id].push(limpio);guardar(db);return true}
 function olvidar(id){const db=leer();delete db[id];guardar(db)}
 return {listar,anotar,olvidar}
}
function detectarMemoria(texto){
 const t=String(texto||"").trim();
 if(/^(?:olvida (?:todo|lo que recuerdas)(?: de mi)?|borra (?:mi )?memoria|!olvidar)$/i.test(t))return {tipo:"borrar"};
 if(/^(?:que recuerdas de mi|!memoria)$/i.test(t))return {tipo:"listar"};
 const m=t.match(/^(?:recuerda (?:que )?|guarda en (?:tu )?memoria(?: que)?[: ]+)(.+)$/i);
 return m?{tipo:"guardar",valor:m[1]}:null;
}
module.exports={crearMemoria,detectarMemoria};
