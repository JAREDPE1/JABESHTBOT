const test=require("node:test"), assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {validarMedia,buscarMediaWhatsApp,analizarMediaGemini}=require("../lib/ai-media-understanding");
const {buscaWeb,consultarWeb}=require("../lib/web-grounding");
const {crearMemoria,detectarMemoria}=require("../lib/ai-memory");
test("imagen/PDF solo MIME permitido y tamaño",()=>{
 validarMedia(Buffer.from("hi"),"image","image/png");
 validarMedia(Buffer.from("hi"),"pdf","application/pdf");
 assert.throws(()=>validarMedia(Buffer.from("hi"),"image","application/x-msdownload"));
 assert.throws(()=>validarMedia(Buffer.alloc(10*1024*1024+1),"pdf","application/pdf"));
});
test("detecta imágenes y PDF en mensaje y cita",()=>{
 const k={remoteJid:"a@s.whatsapp.net"};
 assert.equal(buscarMediaWhatsApp({key:k,message:{imageMessage:{mimetype:"image/jpeg"}}}).tipo,"image");
 assert.equal(buscarMediaWhatsApp({key:k,message:{extendedTextMessage:{contextInfo:{quotedMessage:{documentMessage:{mimetype:"application/pdf"}},stanzaId:"xx"}}}}).tipo,"pdf");
});
test("Gemini multimodal envía contenido correcto",async()=>{
 let req;
 const resultado=await analizarMediaGemini({buffer:Buffer.from("test"),tipo:"image",mime:"image/png",pregunta:"describe",apiKey:"test",post:async(url,body)=>{req={url,body};return {data:{candidates:[{content:{parts:[{text:"Una foto"}]}}]}}}});
 assert.equal(resultado,"Una foto");
 assert.equal(req.body.contents[0].parts[0].inlineData.mimeType,"image/png");
});
test("búsqueda web y enlaces no inventados",async()=>{
 assert.ok(buscaWeb("busca en internet noticias recientes"));
 assert.equal(buscaWeb("hola"),null);
 let req;
 const respuesta=await consultarWeb("noticias",{apiKey:"test",post:async(url,body)=>{req=body;return {data:{candidates:[{content:{parts:[{text:"Respuesta"}]},groundingMetadata:{groundingChunks:[{web:{title:"Fuente",uri:"https://example.com"}}]}}]}}}});
 assert.match(respuesta,/https:\/\/example.com/);
 assert.ok(req.tools[0].google_search);
});
test("memoria solo opt-in, separación de usuarios y borrado",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"jbot-memory-"));try{
 const m=crearMemoria(dir);
 assert.equal(detectarMemoria("recuerda que me gusta el futbol").tipo,"guardar");
 m.anotar("u1","me gusta el futbol");
 assert.equal(m.listar("u1").length,1);
 assert.equal(m.listar("u2").length,0);
 m.olvidar("u1");assert.equal(m.listar("u1").length,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
