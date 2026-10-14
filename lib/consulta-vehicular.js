"use strict";

const URL_SUNARP = "https://consultavehicular.sunarp.gob.pe/consulta-vehicular/inicio";

function normalizarPlaca(entrada) {
    const placa = String(entrada ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
    return /^[A-Z0-9]{5,7}$/.test(placa) ? placa : null;
}

function crearMensajeSunarpManual(placa) {
    return [
        "*Consulta vehicular - SUNARP*",
        "",
        `🚗 Placa: *${placa}*`,
        "",
        "Para consultar gratis los datos oficiales:",
        `1. Abre: ${URL_SUNARP}`,
        `2. Ingresa la placa *${placa}* en la página.`,
        "3. Completa el código de seguridad (CAPTCHA) y pulsa *Realizar Búsqueda*.",
        "",
        "ℹ️ La página oficial requiere verificación humana. Para consultar automáticamente desde WhatsApp, el administrador debe configurar una API autorizada.",
        "La información del portal es referencial."
    ].join("\n");
}

function construirUrlApi(plantilla, placa) {
    const base = String(plantilla || "").trim();
    if (!base) throw new Error("VEHICULO_API_URL_NO_CONFIGURADA");
    const ruta = base.includes("{placa}")
        ? base.replaceAll("{placa}", encodeURIComponent(placa))
        : `${base.replace(/\/$/, "")}/${encodeURIComponent(placa)}`;
    const url = new URL(ruta);
    if (url.protocol !== "https:") throw new Error("VEHICULO_API_URL_DEBE_SER_HTTPS");
    return url.toString();
}

async function consultarVehiculoApi(placa, { apiUrl, token, httpGet } = {}) {
    if (typeof httpGet !== "function") throw new Error("FALTA_CLIENTE_HTTP");
    const url = construirUrlApi(apiUrl, placa);
    const headers = { Accept: "application/json", "User-Agent": "JABESHT-BOT/1.0" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const { data } = await httpGet(url, { timeout: 12000, maxRedirects: 0, headers });
    return data;
}

function obtenerValor(obj, claves) {
    if (!obj || typeof obj !== "object") return null;
    for (const clave of claves) {
        const valor = obj[clave];
        if (typeof valor === "string" || typeof valor === "number") {
            const limpio = String(valor).replace(/[\r\n\t*_\x60~]/g, " ").trim().slice(0, 150);
            if (limpio) return limpio;
        }
    }
    return null;
}

function formatearRespuestaVehicular(placa, respuesta, { esPrivado = false } = {}) {
    if (!respuesta || typeof respuesta !== "object" || respuesta.success === false || respuesta.status === "error") {
        return `🚗 Placa: *${placa}*\nLa API no devolvió información válida sobre este vehículo.`;
    }
    let datos = respuesta.data ?? respuesta.result ?? respuesta.vehiculo ?? respuesta;
    if (Array.isArray(datos)) datos = datos[0];
    if (datos && typeof datos === "object" && datos.vehiculo && typeof datos.vehiculo === "object") datos = datos.vehiculo;
    if (!datos || typeof datos !== "object") {
        return `🚗 Placa: *${placa}*\nLa API no devolvió información válida sobre este vehículo.`;
    }

    const campos = [
        ["🏷️ Marca", ["marca", "brand"]],
        ["🚙 Modelo", ["modelo", "linea", "model"]],
        ["🎨 Color", ["color"]],
        ["🔢 VIN", ["vin", "numeroVin", "numero_vin"]],
        ["🔧 Motor", ["motor", "nro_motor", "numeroMotor", "numero_motor"]],
        ["📄 Serie", ["serie", "numeroSerie", "numero_serie"]],
        ["📍 Sede", ["sede", "oficina", "oficinaRegistral"]],
        ["🚦 Estado", ["estado"]],
        ["⚠️ Anotación", ["anotacion", "anotacionRobo"]],
    ];
    const lineas = ["*Consulta vehicular*", "", `🚗 Placa: *${placa}*`];
    let encontrados = 0;
    for (const [etiqueta, claves] of campos) {
        const valor = obtenerValor(datos, claves);
        if (valor) {
            lineas.push(`${etiqueta}: ${valor}`);
            encontrados++;
        }
    }
    // En grupos, no divulgar nombres de titulares registrales.
    if (esPrivado) {
        const titular = obtenerValor(datos, ["titular", "propietario", "nombrePropietario", "nombre_propietario", "nombre"]);
        if (titular) {
            lineas.push(`👤 Titular: ${titular}`);
            encontrados++;
        }
    }
    if (!encontrados) {
        lineas.push("La API respondió, pero no reconocí datos vehiculares. Revisa el formato JSON del proveedor.");
    }
    lineas.push("", "ℹ️ Respuesta de una API externa configurada por el administrador; comprueba los datos en SUNARP si necesitas confirmación oficial.");
    return lineas.join("\n");
}

module.exports = {
    URL_SUNARP,
    normalizarPlaca,
    crearMensajeSunarpManual,
    construirUrlApi,
    consultarVehiculoApi,
    formatearRespuestaVehicular,
};
