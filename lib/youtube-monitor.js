const { XMLParser, XMLValidator } = require("fast-xml-parser");

const CHANNEL_ID = /^UC[\w-]{22}$/;

async function resolverCanalYoutube(canal, runYtdlp) {
    const perfil = new URL(canal);
    const directo = perfil.pathname.match(/\/channel\/(UC[\w-]{22})(?:\/|$)/)?.[1];
    if (directo) return directo;
    perfil.pathname = perfil.pathname.replace(/\/(videos|shorts|streams)\/?$/, "");
    const data = JSON.parse(await runYtdlp([
        "--flat-playlist", "--dump-single-json", "--playlist-end", "1", "--no-warnings", perfil.href
    ], 120_000));
    const id = [data.channel_id, data.id, data.entries?.[0]?.channel_id].find(value => CHANNEL_ID.test(value || ""));
    if (!id) throw new Error("YouTube no devolvió el ID del canal");
    return id;
}

function leerFeedYoutube(xml, channelId) {
    if (typeof xml !== "string" || XMLValidator.validate(xml) !== true) {
        throw new Error("Respuesta inválida del feed de YouTube");
    }
    const feed = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml).feed;
    // YouTube también publica el ID de cabecera sin el prefijo UC.
    if (!feed || ![channelId, channelId.slice(2)].includes(feed["yt:channelId"])) {
        throw new Error("El feed no corresponde al canal de YouTube");
    }
    const entradas = feed.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : [];
    return entradas.map(entry => {
        const id = entry["yt:videoId"];
        const publishedAt = Date.parse(entry.published);
        if (!/^[\w-]{11}$/.test(id || "") || !Number.isFinite(publishedAt)
            || (entry["yt:channelId"] && entry["yt:channelId"] !== channelId)) {
            throw new Error("Video inválido en el feed de YouTube");
        }
        return {
            id, title: entry.title || "Nuevo video", publishedAt,
            url: `https://www.youtube.com/watch?v=${id}`,
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
    }).sort((a, b) => a.publishedAt - b.publishedAt || a.id.localeCompare(b.id));
}

async function obtenerVideosYoutube(channelId, httpGet) {
    const { data } = await httpGet("https://www.youtube.com/feeds/videos.xml", {
        params: { channel_id: channelId }, timeout: 20_000, responseType: "text",
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/atom+xml,application/xml" },
        maxContentLength: 2 * 1024 * 1024,
    });
    return leerFeedYoutube(data, channelId);
}

// Guarda cada envío exitoso. Un fallo deja pendientes los demás para la próxima revisión.
async function procesarVideosYoutube({ videos, anterior, cuenta, enviar, guardar, activo = () => true }) {
    if (!activo()) return;
    if (!anterior || anterior.cuenta !== cuenta) {
        guardar({ cuenta, seenIds: videos.map(v => v.id), updatedAt: new Date().toISOString() });
        return;
    }
    const conocidos = new Set(anterior.seenIds || (anterior.id ? [anterior.id] : []));
    const indiceAnterior = videos.findIndex(v => v.id === anterior.id);
    const pendientes = videos.filter((video, index) => {
        if (conocidos.has(video.id)) return false;
        if (anterior.seenIds) return true;
        // Migración del monitor antiguo, que solo guardaba el último ID.
        if (indiceAnterior >= 0) return index > indiceAnterior;
        return video.publishedAt > Date.parse(anterior.updatedAt || "");
    });
    const idsPendientes = new Set(pendientes.map(video => video.id));
    videos.filter(video => !idsPendientes.has(video.id)).forEach(video => conocidos.add(video.id));
    for (const video of pendientes) {
        if (!activo()) return;
        await enviar(video);
        if (!activo()) return;
        conocidos.add(video.id);
        guardar({ cuenta, seenIds: [...conocidos].slice(-500), updatedAt: new Date().toISOString() });
    }
    if (activo()) {
        videos.forEach(video => conocidos.add(video.id));
        guardar({ cuenta, seenIds: [...conocidos].slice(-500), updatedAt: new Date().toISOString() });
    }
}

module.exports = { resolverCanalYoutube, leerFeedYoutube, obtenerVideosYoutube, procesarVideosYoutube };
