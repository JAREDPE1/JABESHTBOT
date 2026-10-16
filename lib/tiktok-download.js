"use strict";

const fs = require("node:fs");
const { Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const axios = require("axios");

const MAX_BYTES = 180 * 1024 * 1024;
const HOSTS = ["tikwm.com", "tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com", "byteoversea.com", "ibytedtos.com", "bytecdn.cn"];

function esUrlMediaSegura(valor) {
    if (typeof valor !== "string") return false;
    try {
        const u = new URL(valor), h = u.hostname.toLowerCase();
        return u.protocol === "https:" && !u.username && !u.password &&
            (!u.port || u.port === "443") && HOSTS.some(d => h === d || h.endsWith("." + d));
    } catch { return false; }
}

function clasificarPublicacion(data) {
    const imagenes = Array.isArray(data?.images) ? data.images.filter(x => typeof x === "string" && x.startsWith("https://")) : [];
    const videoUrl = [data?.play, data?.hdplay, data?.wmplay].find(esUrlMediaSegura) || null;
    if (imagenes.length) return { tipo: "fotos", imagenes, videoUrl: null };
    return { tipo: videoUrl ? "video" : "desconocido", imagenes: [], videoUrl };
}

async function guardarVideoDeProveedor(url, archivo, { httpGet = axios.get, limite = MAX_BYTES } = {}) {
    if (!esUrlMediaSegura(url)) throw new Error("TIKTOK_URL_MEDIA_NO_PERMITIDA");
    let actual = url;
    for (let i = 0; i < 4; i++) {
        if (!esUrlMediaSegura(actual)) throw new Error("TIKTOK_REDIRECCION_NO_PERMITIDA");
        const r = await httpGet(actual, {
            responseType: "stream", timeout: 45_000, maxRedirects: 0,
            validateStatus: code => code >= 200 && code < 400,
            headers: { "User-Agent": "Mozilla/5.0", Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5" }
        });
        if ([301,302,303,307,308].includes(r.status)) {
            r.data?.destroy?.();
            if (!r.headers?.location) throw new Error("TIKTOK_REDIRECCION_SIN_URL");
            actual = new URL(r.headers.location, actual).toString();
            continue;
        }
        if (r.status !== 200) {
            r.data?.destroy?.();
            throw new Error("TIKTOK_HTTP_" + r.status);
        }
        const tipo = String(r.headers?.["content-type"] || "").split(";")[0].trim().toLowerCase();
        if (tipo && !["video/mp4", "application/octet-stream", "binary/octet-stream", "video/quicktime"].includes(tipo)) {
            r.data?.destroy?.();
            throw new Error("TIKTOK_RESPUESTA_NO_VIDEO");
        }
        if (Number(r.headers?.["content-length"] || 0) > limite) {
            r.data?.destroy?.();
            throw new Error("TIKTOK_VIDEO_MUY_GRANDE");
        }
        let bytes = 0;
        const limitar = new Transform({ transform(chunk, _, cb) {
            bytes += chunk.length;
            if (bytes > limite) cb(new Error("TIKTOK_VIDEO_MUY_GRANDE"));
            else cb(null, chunk);
        }});
        try {
            await pipeline(r.data, limitar, fs.createWriteStream(archivo, { flags: "wx" }));
            if (bytes < 1024) throw new Error("TIKTOK_ARCHIVO_VACIO");
            return { bytes, origen: actual };
        } catch (e) {
            try { fs.unlinkSync(archivo); } catch {}
            throw e;
        }
    }
    throw new Error("TIKTOK_DEMASIADAS_REDIRECCIONES");
}

async function guardarVideoTikTok(urlPublicacion, archivo, obtenerDatos, opciones = {}) {
    const datos = await obtenerDatos(urlPublicacion);
    const post = clasificarPublicacion(datos);
    if (post.tipo === "fotos") throw new Error("TIKTOK_ES_CARRUSEL");
    if (!post.videoUrl) throw new Error("TIKTOK_API_NO_DEVOLVIO_MP4");
    return guardarVideoDeProveedor(post.videoUrl, archivo, opciones);
}

module.exports = { esUrlMediaSegura, clasificarPublicacion, guardarVideoDeProveedor, guardarVideoTikTok };
