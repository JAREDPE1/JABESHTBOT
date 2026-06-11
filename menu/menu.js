const fs = require("fs");
const path = require("path");

const startMenuText = `Hola, soy *[JABESHT - BOT]*

*Comandos:*
- *!yt <URL>* -> descargar por enlace
- *!play <nombre>* -> mejor resultado automatico
- *!lista <nombre>* -> elegir entre 8 opciones
- *!menu* -> ver este menu
- *!activarkick* -> guardar este grupo para avisos de Kick
- *!verkick* -> revisar si anflo1 esta en vivo
- *!activartiktok @usuario* -> guardar este grupo para avisos de TikTok
- *!vertiktok* -> revisar ultimo video de TikTok
- *.creador* -> ver creditos del bot
`;

const botMenuText = `*[JABESHT - BOT]*

*Comandos del bot*

- *!yt <URL>* -> descarga directo desde YouTube
- *!play <nombre>* -> busca y descarga el mejor resultado
- *!lista <nombre>* -> muestra 8 opciones para elegir
- *!activarkick* -> guardar este grupo para avisos de Kick
- *!verkick* -> revisar si anflo1 esta en vivo
- *!activartiktok @usuario* -> guardar este grupo para avisos de TikTok
- *!vertiktok* -> revisar ultimo video de TikTok
- *.creador* -> ver creditos del bot
`;

const menuImagePath = path.join(__dirname, "foto.png");
const hasMenuImage = fs.existsSync(menuImagePath);

module.exports = {
  startMenuText,
  botMenuText,
  menuImagePath,
  hasMenuImage,
};
