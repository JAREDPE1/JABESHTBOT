"use strict";

const GUIA_COMANDOS = [
    "Descargar música: !play nombre de la canción (elige 1 para MP3) o !lista nombre (elige resultado y luego 1).",
    "Descargar video: !video URL de YouTube, TikTok o Facebook (elige 2 para MP4). También !yt URL, !tiktok URL, !fb URL.",
    "Stickers: responde a una imagen o video corto con !s.",
    "Consulta vehicular: !placa ABC123; DNI: !dni 12345678 (requieren API configurada para resultados automáticos).",
    "IA: !ia pregunta; chat natural: Hola IA; grupos: !activaria, !desactivaria, !estadoia.",
    "Documentos: !resumen tema, !ensayo tema, !monografia tema, !exposicion tema, !introduccion tema, !conclusion tema, !objetivos tema (Word); cambia a !resumen-pptx tema, etc. para PowerPoint. Para PDF o Word puedes pedirlo en conversación natural con IA.",
    "Ayuda: !menu; conectividad: !ping; estado: !estado; créditos: .creador.",
    "Avisos: !activarkick, !desactivarkick, !verkick; !activartiktok @usuario, !desactivartiktok @usuario, !vertiktok; !activaryoutube @canal, !desactivaryoutube @canal, !veryoutube; !activarinstagram @usuario, !desactivarinstagram @usuario, !verinstagram.",
].join("\n");

function normalizar(texto) {
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function detectarAyudaComando(texto) {
    const q = normalizar(texto);
    if (!q || q.length > 1000 || /^[!.]/.test(q)) return null;

    // Guiar solo ante una intención clara de usar funciones del bot,
    // no ante menciones casuales de canciones o documentos en un grupo.
    const pregunta = /\b(como|cual|cuales|que comando|comandos|instrucciones|explica|explicame|ensena|ensename|ayudame|quiero|necesito|puedo|podria|me gustaria|dime|que debo|que tengo)\b/.test(q);
    const descarga = /\b(descargar|descargo|descarga|descargame|bajar|bajo|bajame|guardar|guarda|descargue)\b/.test(q);
    const ayudaGeneral = /\b(comando|comandos|funcion|funciones|ayuda|menu|usar el bot|hace el bot)\b/.test(q) && pregunta;

    if (descarga && /\b(musica|cancion|canciones|mp3|audio|tema musical)\b/.test(q)) {
        return "*🎵 Descargar música*\n\nEscribe *!play nombre de la canción*.\nEjemplo: *!play Bad Bunny - Monaco*\n\nCuando aparezca el resultado, responde *1* para recibir MP3.\n\nSi quieres elegir entre varias canciones, escribe *!lista nombre de la canción*, selecciona el número y luego elige *1* (MP3).";
    }
    if (descarga && /\b(video|videos|mp4|tiktok|youtube|facebook|reel|reels|shorts?)\b/.test(q)) {
        let ejemplo = "!video https://www.youtube.com/watch?v=...";
        let consejo = "Puedes enviar enlaces de YouTube, TikTok o Facebook.";
        if (/\btiktok\b/.test(q)) ejemplo = "!tiktok URL_DEL_VIDEO";
        else if (/\bfacebook\b/.test(q)) ejemplo = "!fb URL_DEL_VIDEO";
        else if (/\byoutube\b/.test(q)) ejemplo = "!yt URL_DEL_VIDEO";
        return "*🎬 Descargar video*\n\nEscribe *" + ejemplo + "*\n" + consejo +
            "\n\nCuando te pregunte el formato, responde *2* (MP4). Si el archivo es demasiado grande, el bot intentará enviarlo como documento MP4.";
    }
    if ((pregunta || /\b(hacer|crear|convertir)\b/.test(q)) && /\b(sticker|stickers|pegatina|pegatinas)\b/.test(q)) {
        return "*🖼️ Crear sticker*\n\nEnvía una imagen o un video corto y responde a ese mensaje con *!s* o *!sticker*.";
    }
    if (pregunta && /\b(placa|sunarp|vehiculo|vehicular|auto registrado)\b/.test(q) &&
        /\b(consultar|consulta|averiguar|buscar|ver|comando|como|quiero|necesito)\b/.test(q)) {
        return "*🚘 Consulta vehicular*\n\nEscribe *!placa ABC123* sustituyendo ABC123 por la placa real.\n\nEl bot consultará mediante la API vehicular si está configurada.";
    }
    if (pregunta && /\b(dni|identidad)\b/.test(q) &&
        /\b(consultar|consulta|averiguar|buscar|ver|comando|como|quiero|necesito)\b/.test(q)) {
        return "*🪪 Consultar DNI*\n\nEscribe *!dni 12345678*, reemplazando los números por el DNI que deseas consultar. Depende de la API configurada.";
    }
    if (pregunta && /\b(ia|inteligencia artificial|chatbot)\b/.test(q) &&
        /\b(activar|desactivar|apagar|encender|habilitar|estado|comando)\b/.test(q)) {
        return "*🤖 Controlar la IA*\n\nEn un grupo escribe *!activaria* para permitir conversaciones naturales y *!desactivaria* para desactivarlas.\n\nConsulta su estado con *!estadoia*. Cualquier integrante puede cambiarlas.\nPara conversar escribe *Hola IA*. Los comandos normales siguen independientes.";
    }
    const tipos = ["monografia","ensayo","resumen","exposicion","introduccion","conclusion","objetivos"];
    const tipo = tipos.find(t => new RegExp("\\b" + t + "\\b").test(q));
    const instruccionDocumento = /\b(como|cual|comando|instrucciones|usar|funciona|pasos|puedo|podria)\b/.test(q);
    if (tipo && instruccionDocumento && /\b(hacer|crea|crear|generar|genero|pido|pedir|comando|usar|hacerme|obtener|word|pdf|pptx|powerpoint)\b/.test(q)) {
        return "*📄 Crear un " + tipo + "*\n\nEscribe *!" + tipo + " TEMA* para generar un documento Word.\n" +
            "Para PowerPoint: *!" + tipo + "-pptx TEMA*.\n\nSi quieres PDF, también puedes activar la IA con *Hola IA* y pedirlo con tus propias palabras, por ejemplo: «Hazme un " + tipo + " sobre la Amazonía en PDF» (requiere LibreOffice en el servidor).";
    }
    if (pregunta && /\b(avisos?|notificaciones?|monitorizar|monitorear|stream|directo|en vivo|publicaciones?)\b/.test(q) &&
        /\b(kick|youtube|tiktok|instagram)\b/.test(q)) {
        const red = /\bkick\b/.test(q) ? "Kick" : /\btiktok\b/.test(q) ? "TikTok" : /\binstagram\b/.test(q) ? "Instagram" : "YouTube";
        const comandos = { Kick: "!activarkick", TikTok: "!activartiktok @usuario", Instagram: "!activarinstagram @usuario", YouTube: "!activaryoutube @canal" };
        return "*🔔 Avisos de " + red + "*\n\nDentro del grupo escribe *" + comandos[red] + "*.\nPara detenerlos utiliza el comando *!desactivar* correspondiente a esa red (por ejemplo: !desactivaryoutube @canal).\n\nConsulta todos los comandos con *!menu*.";
    }
    if (ayudaGeneral) {
        if (/\b(ping|latencia|velocidad)\b/.test(q)) return "Para comprobar la latencia del bot escribe *!ping*.";
        if (/\b(estado|encendido|funcionando|activo)\b/.test(q)) return "Para consultar el estado del bot escribe *!estado*.";
        return "¡Claro! 😊 Escribe *!menu* para ver todos los comandos de JABESHTBOT.\n\nPuedes preguntarme cómo descargar música o videos, crear stickers, consultar placas/DNI, hacer Word/PDF/PowerPoint y activar avisos.";
    }
    return null;
}

module.exports = { detectarAyudaComando, GUIA_COMANDOS };
