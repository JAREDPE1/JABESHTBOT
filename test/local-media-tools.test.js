const test = require("node:test");
const assert = require("node:assert/strict");
const tools = require("../lib/local-media-tools");
test("identifica solicitudes de quitar fondo, pero no mensajes ajenos",()=>{
 assert.equal(tools.isBackgroundRequest("quítale el fondo a esta foto"),true);
 assert.equal(tools.isBackgroundRequest("!quitarfondo"),true);
 assert.equal(tools.isBackgroundRequest("hola"),false);
});
test("detecta audios ptt e imágenes citadas",()=>{
 const a={key:{remoteJid:"a@s.whatsapp.net"},message:{audioMessage:{ptt:true,seconds:4,mimetype:"audio/ogg"}}};
 assert.ok(tools.voiceNote(a));tools.checkVoiceMedia(tools.voiceNote(a));
 assert.throws(()=>tools.checkVoiceMedia({ptt:true,seconds:200}),/VOICE_TOO_LONG/);
 const b={key:{remoteJid:"a@s.whatsapp.net"},message:{extendedTextMessage:{contextInfo:{stanzaId:"id",quotedMessage:{imageMessage:{mimetype:"image/jpeg"}}}}}};
 assert.ok(tools.getImageQuotedOrDirect(b));
});
test("exclusión de tareas simultáneas",async()=>{
 const gate=tools.createBusyGate();let release;
 const pending=new Promise(resolve=>release=resolve);
 const first=gate.run(()=>pending);
 await assert.rejects(()=>gate.run(async()=>{}),/MEDIA_BUSY/);
 release();await first;
 assert.equal(gate.isBusy(),false);
});
test("transcripción y voz rechazan archivos vacíos",async()=>{
 await assert.rejects(()=>tools.transcribeVoice(Buffer.alloc(0)),/VOICE_TOO_BIG/);
 assert.throws(()=>tools.checkImageMedia({mimetype:"image/gif"}),/IMAGE_MIME/);
});
