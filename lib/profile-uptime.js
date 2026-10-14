const ABOUT_QUERY_ID = "9152604461510864";

// WhatsApp Web usa una Info. temporal. La versión actual de Baileys solo
// actualiza la biografía antigua, así que enviamos también la consulta MEX.
async function actualizarInfoWhatsapp(sock, texto) {
    const input = texto
        ? { text: texto, ephemeral_duration_sec: 86400 }
        : { text: null, ephemeral_duration_sec: 0 };
    let errorModerno;
    try {
        const respuesta = await sock.query({
            tag: "iq",
            attrs: { to: "@s.whatsapp.net", type: "get", xmlns: "w:mex" },
            content: [{
                tag: "query",
                attrs: { query_id: ABOUT_QUERY_ID },
                content: Buffer.from(JSON.stringify({ variables: { input } }), "utf8"),
            }],
        });
        const resultado = respuesta?.content?.find(nodo => nodo.tag === "result");
        const datos = resultado?.content && JSON.parse(resultado.content.toString());
        if (datos?.errors?.length || !datos?.data?.xwa2_update_text_status?.result) {
            throw new Error(datos?.errors?.[0]?.message || "WhatsApp no confirmó la Info. temporal");
        }
    } catch (err) {
        errorModerno = err;
    }

    try {
        await sock.updateProfileStatus(texto);
    } catch (err) {
        if (errorModerno) throw new AggregateError([errorModerno, err], "No se pudo actualizar Info. en WhatsApp");
        console.warn("No se pudo actualizar la biografía antigua:", err.message);
    }
    if (errorModerno) throw new Error(`No se pudo actualizar la Info. temporal: ${errorModerno.message}`);
}

function crearEstadoPerfil({ nombre, formatearDuracion, intervaloMs = 60_000, escribir = actualizarInfoWhatsapp }) {
    let timer = null;
    let socket = null;
    let conectadoDesde = null;
    let pendiente = Promise.resolve();
    let activo = false;

    function encolar(texto) {
        const destino = socket;
        pendiente = pendiente.catch(() => {}).then(() => escribir(destino, texto));
        pendiente.catch(err => console.error("No pude actualizar la info del perfil:", err.message));
        return pendiente;
    }

    function detener() {
        activo = false;
        if (timer) clearInterval(timer);
        timer = null;
    }

    function iniciar(sock, desde = Date.now()) {
        detener();
        socket = sock;
        conectadoDesde = desde;
        activo = true;
        const actualizar = () => {
            if (!activo) return;
            const texto = `${nombre} | Conectado: ${formatearDuracion((Date.now() - conectadoDesde) / 1000)}`;
            encolar(texto);
        };
        actualizar();
        timer = setInterval(actualizar, intervaloMs);
    }

    async function apagar() {
        detener();
        if (!socket) return;
        await pendiente.catch(() => {});
        await encolar("");
        socket = null;
    }

    return { iniciar, detener, apagar };
}

module.exports = { actualizarInfoWhatsapp, crearEstadoPerfil };
