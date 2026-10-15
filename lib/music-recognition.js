"use strict";
const axios=require("axios");
async function reconocerMusica(buffer,{token,post=axios.post}={}){
 if(!token)throw Error("AUDD_API_TOKEN_MISSING");
 if(!Buffer.isBuffer(buffer)||buffer.length===0||buffer.length>8*1024*1024)throw Error("AUDIO_TAMANO_INVALIDO");
 const form=new FormData();
 form.append("api_token",token);
 form.append("audio",new Blob([buffer]),"cancion.bin");
 const {data}=await post("https://api.audd.io/",form,{timeout:45000,maxBodyLength:10*1024*1024});
 if(data?.status!=="success")throw Error("AUDD_API_ERROR");
 const r=data.result;
 return r?["🎵 *"+r.title+"*","Artista: "+(r.artist||"Desconocido"),r.album?"Álbum: "+r.album:""].filter(Boolean).join("\n"):"No pude reconocer la canción. Prueba con un audio más claro y corto.";
}
module.exports={reconocerMusica};
