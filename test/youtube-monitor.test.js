const test = require("node:test");
const assert = require("node:assert/strict");
const { leerFeedYoutube, procesarVideosYoutube, resolverCanalYoutube } = require("../lib/youtube-monitor");

const channelId = "UCBR8-60-B28hp2BmDPdntcQ";
const videos = [1, 2, 3].map(n => ({ id: `video00000${n}`, publishedAt: n * 1000 }));
const cuenta = "https://www.youtube.com/@prueba/videos";

test("lee Shorts, entidades XML e ID de cabecera sin UC", () => {
    const xml = `<feed><yt:channelId>${channelId.slice(2)}</yt:channelId><entry>
      <yt:videoId>abcdefghijk</yt:videoId><yt:channelId>${channelId}</yt:channelId>
      <title>Un Short &amp; una noticia</title><link href="https://www.youtube.com/shorts/abcdefghijk"/>
      <published>2026-10-14T12:00:00Z</published></entry></feed>`;
    const parsed = leerFeedYoutube(xml, channelId);
    assert.equal(parsed[0].title, "Un Short & una noticia");
    assert.equal(parsed[0].id, "abcdefghijk");
    assert.throws(() => leerFeedYoutube("<html>Error temporal</html>", channelId));
    assert.throws(() => leerFeedYoutube(xml, "UC0000000000000000000000"));
});

test("un ID de canal conocido no requiere yt-dlp", async () => {
    assert.equal(await resolverCanalYoutube(`https://www.youtube.com/channel/${channelId}/videos`, () => {
        throw new Error("No debe ejecutarse");
    }), channelId);
});

test("resuelve el perfil sin exigir una pestaña Videos para canales de Shorts", async () => {
    const id = await resolverCanalYoutube(cuenta, async args => {
        assert.equal(args.at(-1), "https://www.youtube.com/@prueba");
        return JSON.stringify({ id: channelId, entries: [] });
    });
    assert.equal(id, channelId);
});

test("la activación establece referencia y después entrega todos los nuevos una sola vez", async () => {
    let estado;
    const enviados = [];
    const args = () => ({ cuenta, anterior: estado, enviar: async v => enviados.push(v.id), guardar: v => { estado = v; } });
    await procesarVideosYoutube({ ...args(), videos: videos.slice(0, 1) });
    assert.deepEqual(enviados, []);
    await procesarVideosYoutube({ ...args(), videos });
    await procesarVideosYoutube({ ...args(), videos });
    assert.deepEqual(enviados, [videos[1].id, videos[2].id]);
});

test("migra estado antiguo y reintenta solo el envío fallido tras un reinicio", async () => {
    let estado = { cuenta, id: videos[1].id, updatedAt: new Date(2000).toISOString() };
    const enviados = [];
    const guardar = v => { estado = JSON.parse(JSON.stringify(v)); };
    await assert.rejects(procesarVideosYoutube({ cuenta, anterior: estado, videos, guardar,
        enviar: async () => { throw new Error("WhatsApp desconectado"); } }));
    assert.equal(estado.id, videos[1].id);
    await procesarVideosYoutube({ cuenta, anterior: estado, videos, guardar, enviar: async v => enviados.push(v.id) });
    await procesarVideosYoutube({ cuenta, anterior: estado, videos, guardar, enviar: async v => enviados.push(v.id) });
    assert.deepEqual(enviados, [videos[2].id]);
});

test("conserva entregas parciales y deja pendientes las restantes", async () => {
    let estado = { cuenta, seenIds: [videos[0].id] };
    const enviados = [];
    const guardar = v => { estado = v; };
    await assert.rejects(procesarVideosYoutube({ cuenta, anterior: estado, videos, guardar, enviar: async v => {
        if (v.id === videos[2].id) throw new Error("fallo de envío");
        enviados.push(v.id);
    } }));
    await procesarVideosYoutube({ cuenta, anterior: estado, videos, guardar, enviar: async v => enviados.push(v.id) });
    assert.deepEqual(enviados, [videos[1].id, videos[2].id]);
});

test("desactivar durante una revisión cancela los avisos restantes", async () => {
    let activo = true;
    const enviados = [];
    await procesarVideosYoutube({ cuenta, anterior: { cuenta, seenIds: [videos[0].id] }, videos,
        activo: () => activo, guardar: () => {}, enviar: async v => { enviados.push(v.id); activo = false; } });
    assert.deepEqual(enviados, [videos[1].id]);
});
