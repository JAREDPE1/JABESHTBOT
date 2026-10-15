"use strict";

// !lista: resultados relevantes primero; sin limitarse a clips de 10 minutos.
const MAX_DURACION_LISTA = 90 * 60;
const MAX_RESULTADOS_LISTA = 8;
const PALABRAS_VACIAS = new Set([
    "a", "al", "el", "la", "los", "las", "lo", "un", "una", "unos", "unas",
    "de", "del", "en", "con", "y", "o", "por", "para", "que", "se", "es",
    "video", "videos", "ver", "busca", "buscar", "quiero", "me", "sobre"
]);
const ALIAS = {
    peru: ["peru", "peruano", "peruana", "peruanos", "peruanas", "lima"],
    eeuu: ["eeuu", "estados unidos", "usa"],
};

function normalizarBusqueda(texto) {
    return String(texto || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ").trim();
}

function palabrasClave(query) {
    const limpias = normalizarBusqueda(query).split(" ").filter(Boolean);
    const importantes = limpias.filter(p => p.length > 1 && !PALABRAS_VACIAS.has(p));
    return [...new Set(importantes.length ? importantes : limpias)].slice(0, 9);
}

function contienePalabra(textoNormalizado, palabra) {
    if (!textoNormalizado) return false;
    const opciones = ALIAS[palabra] || [palabra];
    return opciones.some(op => (" " + textoNormalizado + " ").includes(" " + op + " "));
}

function analizarCoincidencia(video, consulta) {
    const claves = palabrasClave(consulta);
    const titulo = normalizarBusqueda(video?.title);
    const canal = normalizarBusqueda(video?.author?.name || video?.author);
    const descripcion = normalizarBusqueda(video?.description).slice(0, 500);
    let encontradas = 0;
    let enTitulo = 0;
    let puntos = 0;
    for (const palabra of claves) {
        if (contienePalabra(titulo, palabra)) {
            enTitulo++;
            encontradas++;
            puntos += 25;
        } else if (contienePalabra(canal, palabra)) {
            encontradas++;
            puntos += 15;
        } else if (contienePalabra(descripcion, palabra)) {
            encontradas++;
            puntos += 4;
        }
    }
    if (claves.length && encontradas === claves.length) puntos += 45;
    if (claves.length && enTitulo === claves.length) puntos += 30;
    const frase = normalizarBusqueda(consulta);
    if (frase.length > 5 && titulo.includes(frase)) puntos += 65;
    // No dar puntos extra solo por muchas vistas: importa que trate del tema.
    return { puntos, encontradas, total: claves.length, enTitulo };
}

function esVideoApto(video) {
    const duracion = Number(video?.seconds);
    return video && typeof video.url === "string" &&
        /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(video.url) &&
        Number.isFinite(duracion) && duracion > 0 && duracion <= MAX_DURACION_LISTA;
}

function seleccionarVideosRelevantes(query, videos, limite = MAX_RESULTADOS_LISTA) {
    const unicos = new Map();
    for (const video of videos || []) {
        if (!esVideoApto(video)) continue;
        const id = video.videoId || video.url;
        if (!unicos.has(id)) unicos.set(id, video);
    }
    const claves = palabrasClave(query);
    const minimo = claves.length < 3 ? claves.length : Math.ceil(claves.length * 0.75);
    return [...unicos.values()]
        .map((video, indice) => ({ video, indice, ...analizarCoincidencia(video, query) }))
        .filter(x => x.total > 0 && x.encontradas >= minimo)
        .sort((a, b) => b.encontradas - a.encontradas ||
            b.puntos - a.puntos || a.indice - b.indice)
        .slice(0, limite)
        .map(x => x.video);
}

async function buscarVideosLista(query, buscar, { minimo = 5 } = {}) {
    if (typeof buscar !== "function") throw new Error("SEARCH_PROVIDER_REQUIRED");
    const primera = await buscar(query);
    const videos = [...(primera?.videos || [])];
    let seleccionados = seleccionarVideosRelevantes(query, videos);

    // Una segunda búsqueda más específica, solo si los resultados son pocos.
    // No requiere API de pago; usa el buscador yt-search ya instalado.
    const claves = palabrasClave(query);
    if (seleccionados.length < minimo && claves.length >= 2) {
        const alternativa = claves.map(p => '"' + p + '"').join(" ");
        if (normalizarBusqueda(alternativa) !== normalizarBusqueda(query) ||
            alternativa !== query) {
            try {
                const segunda = await buscar(alternativa);
                videos.push(...(segunda?.videos || []));
                seleccionados = seleccionarVideosRelevantes(query, videos);
            } catch (error) {
                console.warn("Búsqueda secundaria de YouTube no disponible:", error.message);
            }
        }
    }
    return seleccionados;
}

module.exports = {
    MAX_DURACION_LISTA,
    palabrasClave,
    normalizarBusqueda,
    analizarCoincidencia,
    seleccionarVideosRelevantes,
    buscarVideosLista,
};
