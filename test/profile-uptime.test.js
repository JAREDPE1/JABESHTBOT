const test = require("node:test");
const assert = require("node:assert/strict");
const { actualizarInfoWhatsapp, crearEstadoPerfil } = require("../lib/profile-uptime");

test("escribe la Info. temporal y la biografía antigua", async () => {
    const consultas = [];
    const estados = [];
    const sock = {
        query: async nodo => {
            consultas.push(nodo);
            return { content: [{ tag: "result", content: Buffer.from(JSON.stringify({ data: { xwa2_update_text_status: { result: true } } })) }] };
        },
        updateProfileStatus: async texto => estados.push(texto),
    };
    await actualizarInfoWhatsapp(sock, "Jabesht | Conectado: 1d 2h 3m 4s");
    assert.equal(consultas[0].attrs.xmlns, "w:mex");
    assert.equal(consultas[0].attrs.to, "@s.whatsapp.net");
    assert.deepEqual(JSON.parse(consultas[0].content[0].content.toString()).variables.input, {
        text: "Jabesht | Conectado: 1d 2h 3m 4s",
        ephemeral_duration_sec: 86400,
    });
    assert.deepEqual(estados, ["Jabesht | Conectado: 1d 2h 3m 4s"]);

    await actualizarInfoWhatsapp(sock, "");
    assert.deepEqual(JSON.parse(consultas[1].content[0].content.toString()).variables.input, {
        text: null,
        ephemeral_duration_sec: 0,
    });
    assert.deepEqual(estados, ["Jabesht | Conectado: 1d 2h 3m 4s", ""]);
});

test("el apagado espera la actualización pendiente y borra al final", async () => {
    const escrituras = [];
    let terminarPrimera;
    const primera = new Promise(resolve => { terminarPrimera = resolve; });
    const perfil = crearEstadoPerfil({
        nombre: "Bot",
        formatearDuracion: () => "0d 0h 0m 0s",
        escribir: async (_sock, texto) => {
            escrituras.push(texto);
            if (texto) await primera;
        },
    });
    perfil.iniciar({});
    const apagado = perfil.apagar();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(escrituras, ["Bot | Conectado: 0d 0h 0m 0s"]);
    terminarPrimera();
    await apagado;
    assert.deepEqual(escrituras, ["Bot | Conectado: 0d 0h 0m 0s", ""]);
});

test("informa cuando WhatsApp rechaza la Info. nueva aunque acepte la antigua", async () => {
    const sock = {
        query: async () => ({ content: [{ tag: "result", content: Buffer.from(JSON.stringify({ errors: [{ message: "rechazado" }] })) }] }),
        updateProfileStatus: async () => {},
    };
    await assert.rejects(actualizarInfoWhatsapp(sock, "Bot activo"), /rechazado/);
});
