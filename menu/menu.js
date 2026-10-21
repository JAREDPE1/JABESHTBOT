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
- *Fotos/PDF* -> envía y pregunta directamente (Gemini)
- *!buscar <pregunta>* -> buscar en la web si está habilitada
- *!reconocer* -> responde a un audio de música
- *recuerda que ...* / *qué recuerdas de mí* / *olvida todo* -> memoria privada
- *Conversacion IA* -> escribe directamente sin comando; en grupos requiere !activaria
- *!activaria* -> habilitar IA natural en el grupo (cualquier integrante)
- *!desactivaria* -> deshabilitar IA natural en el grupo (cualquier integrante)
- *!estadoia* -> consultar estado de IA natural en este grupo
- *!añadir +51987654321* -> solicitar añadir número internacional
- *!quitar @persona* -> solicitar retirar integrante
- *!aprobar ID* / *!rechazar ID* -> confirmar solicitud (administradores)
- *!monografia <tema>* -> generar monografia y Word
- *!monografia-pptx <tema>* -> generar monografia y PowerPoint
- *!ensayo <tema>* -> generar ensayo y Word
- *!ensayo-pptx <tema>* -> generar ensayo y PowerPoint
- *!resumen <tema>* -> generar resumen y Word
- *!resumen-pptx <tema>* -> generar resumen y PowerPoint
- *!exposicion <tema>* -> generar exposicion y Word
- *!exposicion-pptx <tema>* -> generar exposicion y PowerPoint
- *!introduccion <tema>* -> generar introduccion y Word
- *!introduccion-pptx <tema>* -> generar introduccion y PowerPoint
- *!conclusion <tema>* -> generar conclusion y Word
- *!conclusion-pptx <tema>* -> generar conclusion y PowerPoint
- *!objetivos <tema>* -> generar objetivos y Word
- *!objetivos-pptx <tema>* -> generar objetivos y PowerPoint
- *!s* -> crear sticker respondiendo a imagen/video
- *!dni <numero>* -> consultar DNI
- *!placa <placa>* -> consulta vehicular SUNARP (enlace oficial o API autorizada) 
- *!ping* -> probar velocidad del bot
- *!estado* -> ver estado del bot
- *!activarkick* -> guardar este grupo para avisos de Kick
- *!desactivarkick* -> detener avisos de Kick en este grupo
- *!verkick* -> revisar si anflo1 esta en vivo
- *!activartiktok @usuario* -> guardar este grupo para avisos de TikTok
- *!desactivartiktok @usuario* -> detener avisos de TikTok
- *!vertiktok* -> revisar ultimo video de TikTok
- *!activaryoutube @canal* -> avisos de videos nuevos de YouTube
- *!desactivaryoutube @canal* -> detener avisos de YouTube
- *!veryoutube* -> revisar ultimo video de YouTube
- *!activarinstagram @usuario* -> avisos de videos y reels de Instagram
- *!desactivarinstagram @usuario* -> detener avisos de Instagram
- *!verinstagram* -> revisar ultimo video de Instagram
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
- *Fotos/PDF* -> envía y pregunta directamente (Gemini)
- *!buscar <pregunta>* -> buscar en la web si está habilitada
- *!reconocer* -> responde a un audio de música
- *recuerda que ...* / *qué recuerdas de mí* / *olvida todo* -> memoria privada
- *Conversacion IA* -> escribe directamente sin comando; en grupos requiere !activaria
- *!activaria* -> habilitar IA natural en el grupo (cualquier integrante)
- *!desactivaria* -> deshabilitar IA natural en el grupo (cualquier integrante)
- *!estadoia* -> consultar estado de IA natural en este grupo
- *!añadir +51987654321* -> solicitar añadir número internacional
- *!quitar @persona* -> solicitar retirar integrante
- *!aprobar ID* / *!rechazar ID* -> confirmar solicitud (administradores)
- *!monografia <tema>* -> generar monografia y Word
- *!monografia-pptx <tema>* -> generar monografia y PowerPoint
- *!ensayo <tema>* -> generar ensayo y Word
- *!ensayo-pptx <tema>* -> generar ensayo y PowerPoint
- *!resumen <tema>* -> generar resumen y Word
- *!resumen-pptx <tema>* -> generar resumen y PowerPoint
- *!exposicion <tema>* -> generar exposicion y Word
- *!exposicion-pptx <tema>* -> generar exposicion y PowerPoint
- *!introduccion <tema>* -> generar introduccion y Word
- *!introduccion-pptx <tema>* -> generar introduccion y PowerPoint
- *!conclusion <tema>* -> generar conclusion y Word
- *!conclusion-pptx <tema>* -> generar conclusion y PowerPoint
- *!objetivos <tema>* -> generar objetivos y Word
- *!objetivos-pptx <tema>* -> generar objetivos y PowerPoint
- *!s* -> crear sticker respondiendo a imagen/video
- *!dni <numero>* -> consultar DNI
- *!placa <placa>* -> consulta vehicular SUNARP (enlace oficial o API autorizada) 
- *!ping* -> probar velocidad del bot
- *!estado* -> ver estado del bot
- *!activarkick* -> guardar este grupo para avisos de Kick
- *!desactivarkick* -> detener avisos de Kick en este grupo
- *!verkick* -> revisar si anflo1 esta en vivo
- *!activartiktok @usuario* -> guardar este grupo para avisos de TikTok
- *!desactivartiktok @usuario* -> detener avisos de TikTok
- *!vertiktok* -> revisar ultimo video de TikTok
- *!activaryoutube @canal* -> avisos de videos nuevos de YouTube
- *!desactivaryoutube @canal* -> detener avisos de YouTube
- *!veryoutube* -> revisar ultimo video de YouTube
- *!activarinstagram @usuario* -> avisos de videos y reels de Instagram
- *!desactivarinstagram @usuario* -> detener avisos de Instagram
- *!verinstagram* -> revisar ultimo video de Instagram
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
