"use strict";
const axios=require("axios");
function buscaWeb(texto){
 const t=String(texto||"").trim();
 if(/^!buscar\s+/i.test(t))return t.replace(/^!buscar\s+/i,"");
 if(/(?:busca en internet|busca en la web|noticias de hoy|informacion actualizada|investiga en internet)/i.test(t))return t;
 return null;
}
async function consultarWeb(pregunta,{apiKey,model,post=axios.post}={}){
 if(!apiKey)throw new Error("GEMINI_API_KEY_MISSING");
 const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model||"gemini-2.5-flash")+":generateContent";
 const {data}=await post(url,{contents:[{parts:[{text:"Responde en español con datos actuales y cita enlaces comprobables: "+String(pregunta).slice(0,2000)}]}],tools:[{google_search:{}}]},{
 timeout:90000,headers:{"x-goog-api-key":apiKey,"Content-Type":"application/json"}});
 const candidato=data?.candidates?.[0];
 const respuesta=(candidato?.content?.parts||[]).map(x=>x.text||"").join("\n").trim();
 const fuentes=(candidato?.groundingMetadata?.groundingChunks||[]).map(x=>x.web).filter(x=>x?.uri?.startsWith("https://")).slice(0,5);
 if(!respuesta)throw Error("WEB_EMPTY_RESPONSE");
 return respuesta+"\n\nFuentes:\n"+(fuentes.length?fuentes.map(x=>x.title+": "+x.uri).join("\n"):"No se devolvieron enlaces verificables; comprueba la información.");
}
module.exports={buscaWeb,consultarWeb};
