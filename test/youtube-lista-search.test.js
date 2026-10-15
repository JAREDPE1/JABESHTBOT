const test = require("node:test");
const assert = require("node:assert/strict");
const { palabrasClave, seleccionarVideosRelevantes, buscarVideosLista } = require("../lib/youtube-lista-search");
const video = (title,id,seconds=180)=>({title,videoId:id,url:"https://www.youtube.com/watch?v="+id,seconds,author:{name:"Canal"}});
test("Perú y peru mantienen los mismos términos",()=>{
 assert.deepEqual(palabrasClave("Ibai en Perú"),["ibai","peru"]);
});
test("lista solo videos que tratan de Ibai en Perú",()=>{
 const candidatos=[
  video("Ibai juega Minecraft","a"),
  video("Turismo en Perú","b"),
  video("Ibai visitó Perú y comió ceviche","c",2500),
  video("IBAI EN PERU","d",450),
  video("Ibai en México","e"),
 ];
 const titulos=seleccionarVideosRelevantes("Ibai en Perú",candidatos).map(v=>v.title);
 assert.deepEqual(titulos,["IBAI EN PERU","Ibai visitó Perú y comió ceviche"]);
});
test("videos de más de 10 minutos se aceptan, pero no directos larguísimos",()=>{
 const r=seleccionarVideosRelevantes("Ibai Perú",[
   video("Ibai en Perú documental 40 minutos","a",2400),
   video("Ibai en Perú stream de 8 horas","b",28800)
 ]);
 assert.deepEqual(r.map(v=>v.videoId),["a"]);
});
test("la búsqueda secundaria ayuda si faltan resultados sin duplicar",async()=>{
 let llamadas=0;
 const buscar=async()=>{llamadas++;return {videos:llamadas===1?[video("Ibai en México","a")]:[video("Ibai en Perú","b"),video("Ibai en Perú","b")]};};
 const r=await buscarVideosLista("Ibai en Perú",buscar);
 assert.equal(r.length,1);
 assert.equal(llamadas,2);
});
