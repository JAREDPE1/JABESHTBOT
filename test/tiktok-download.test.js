const test=require("node:test"),assert=require("node:assert/strict");
const { esUrlMediaSegura, clasificarPublicacion }=require("../lib/tiktok-download");
test("video publico no se confunde con portada",()=>{
 const p=clasificarPublicacion({cover:"https://tikwm.com/cover.jpg",duration:15,play:"https://www.tikwm.com/files/a.mp4"});
 assert.equal(p.tipo,"video");
 assert.ok(p.videoUrl);
});
test("carrusel real se detecta por images",()=>{
 const p=clasificarPublicacion({images:["https://example.com/a.jpg","https://example.com/b.jpg"]});
 assert.equal(p.tipo,"fotos"); assert.equal(p.imagenes.length,2);
});
test("URL externas o inseguras de media rechazadas",()=>{
 assert.equal(esUrlMediaSegura("https://tikwm.com/video.mp4"),true);
 for (const x of ["http://tikwm.com/x","https://tikwm.com.evil.com/x","https://127.0.0.1/x","https://localhost/x","file:///tmp/a.mp4"])assert.equal(esUrlMediaSegura(x),false,x);
});
