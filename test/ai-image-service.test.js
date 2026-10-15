const test = require("node:test");
const assert = require("node:assert/strict");
const {
 detectarSolicitudImagen, imageGenerationEnabled, crearLimitadorImagenes,
 extraerImagenRespuesta, generarImagenGemini
} = require("../lib/ai-image-service");

test("peticiones naturales de imagen se detectan", () => {
 assert.ok(detectarSolicitudImagen("Créame un hombre en la luna"));
 assert.ok(detectarSolicitudImagen("Hola IA, genera una imagen de un astronauta"));
 assert.ok(detectarSolicitudImagen("Dibújame un gato astronauta"));
});
test("no interceptar comandos ni peticiones de texto", () => {
 for (const s of ["!placa ABC123","!play una canción","Hazme un resumen de la historia en PDF","¿Puedes crear imágenes?","Hola, ¿qué tal?"]) {
  assert.equal(detectarSolicitudImagen(s),null,s);
 }
});
test("deshabilitado por defecto y límites por hora", () => {
 assert.equal(imageGenerationEnabled({}),false);
 assert.equal(imageGenerationEnabled({ IMAGE_GENERATION_ENABLED:"true" }),true);
 const limite = crearLimitadorImagenes(2,3600000);
 assert.equal(limite("usuario",10),true);
 assert.equal(limite("usuario",11),true);
 assert.equal(limite("usuario",12),false);
 assert.equal(limite("usuario",3600012),true);
});
test("respuesta del proveedor incluye buffer de imagen", async () => {
 const base64 = Buffer.from("test-image").toString("base64");
 const respuesta = {steps:[{type:"model_output",content:[{type:"image",mime_type:"image/png",data:base64}]}]};
 assert.equal(extraerImagenRespuesta(respuesta).buffer.toString(),"test-image");
 let request;
 const imagen = await generarImagenGemini("un paisaje",{
  apiKey:"test",
  post:async (url,body,options)=>{request={url,body,options};return {data:respuesta};}
 });
 assert.equal(imagen.buffer.toString(),"test-image");
 assert.equal(request.body.input,"un paisaje");
 assert.equal(request.body.response_format.type,"image");
});
