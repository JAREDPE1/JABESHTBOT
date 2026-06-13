const fs = require("fs");
const path = require("path");

const startMenuText = `Hola, soy *[JABESHT - BOT]*

*Comandos:*
--HERRAMIENTAS DE DESCARGA--
- *!yt <URL>* -> descargar YouTube por enlace
- *!video <URL>* -> descargar video de YouTube/TikTok/Facebook
- *!fb <URL>* -> descargar video de Facebook
- *!tiktok <URL>* -> descargar video de TikTok
- *!play <nombre>* -> mejor resultado automatico
- *!lista <nombre>* -> elegir entre 8 opciones
--UTILIDADES--
- *!ia <pregunta>* -> responder con inteligencia artificial
- *!monografia <tema>* -> generar monografia y Word
- *!ensayo <tema>* -> generar ensayo y Word
- *!resumen <tema>* -> generar resumen y Word
- *!exposicion <tema>* -> generar exposicion y Word
- *!introduccion <tema>* -> generar introduccion y Word
- *!conclusion <tema>* -> generar conclusion y Word
- *!objetivos <tema>* -> generar objetivos y Word
- *!s* -> crear sticker respondiendo a imagen/video
- *!dni <numero>* -> consultar DNI 
- *!ping* -> probar velocidad del bot
- *!estado* -> ver estado del bot
- *!activarkick* -> guardar este grupo para avisos de Kick
- *!verkick* -> revisar si anflo1 esta en vivo
- *!activartiktok @usuario* -> guardar este grupo para avisos de TikTok
- *!vertiktok* -> revisar ultimo video de TikTok
        --CREADOR--
- *.creador* -> ver creditos del bot
`;

const botMenuText = `*[JABESHT - BOT]*

*Comandos del bot*
--HERRAMIENTAS DE DESCARGA--
- *!yt <URL>* -> descarga directo desde YouTube
- *!video <URL>* -> descarga video de YouTube/TikTok/Facebook
- *!fb <URL>* -> descarga video de Facebook
- *!tiktok <URL>* -> descarga video de TikTok
- *!play <nombre>* -> busca y descarga el mejor resultado
- *!lista <nombre>* -> muestra 8 opciones para elegir
--UTILIDADES--
- *!ia <pregunta>* -> responder con inteligencia artificial
- *!monografia <tema>* -> generar monografia y Word
- *!ensayo <tema>* -> generar ensayo y Word
- *!resumen <tema>* -> generar resumen y Word
- *!exposicion <tema>* -> generar exposicion y Word
- *!introduccion <tema>* -> generar introduccion y Word
- *!conclusion <tema>* -> generar conclusion y Word
- *!objetivos <tema>* -> generar objetivos y Word
- *!s* -> crear sticker respondiendo a imagen/video
- *!dni <numero>* -> consultar DNI 
- *!ping* -> probar velocidad del bot
- *!estado* -> ver estado del bot
- *!activarkick* -> guardar este grupo para avisos de Kick
- *!verkick* -> revisar si anflo1 esta en vivo
- *!activartiktok @usuario* -> guardar este grupo para avisos de TikTok
- *!vertiktok* -> revisar ultimo video de TikTok
        --CREADOR--
- *.creador* -> ver creditos del bot
`;

const menuImagePath = path.join(__dirname, "fotoo.png");
const hasMenuImage = fs.existsSync(menuImagePath);

module.exports = {
  startMenuText,
  botMenuText,
  menuImagePath,
  hasMenuImage,
};
