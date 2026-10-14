"use strict";
const CROMA_ENDPOINT = "https://api.croma.run/pe/sunarp-vehicular/vehicle-by-plate/v1";

async function consultarCroma(placa, apiKey, axios) {
    if (!apiKey) throw new Error("Falta CROMA_API_KEY");
    const { data } = await axios.post(CROMA_ENDPOINT, { plate: placa }, {
        timeout: 90000,
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    });
    return data?.data ?? data;
}

function formatearCroma(placa, datos) {
    if (datos?.found === false) return "No se encontró la placa *" + placa + "*.";
    const campos = [
        ["Marca", "make"], ["Modelo", "model"], ["Año", "model_year"],
        ["Color", "color"], ["Motor", "engine_number"], ["Serie", "serial_number"],
        ["VIN", "vin"], ["Estado", "vehicle_status"], ["Anotaciones", "annotations"]
    ];
    const lineas = ["*Consulta vehicular SUNARP*", "🚗 Placa: *" + placa + "*"];
    let vistos = 0;
    for (const [nombre, clave] of campos) {
        const valor = datos?.[clave];
        if (typeof valor === "string" || typeof valor === "number") {
            lineas.push(nombre + ": " + String(valor).replace(/[\r\n*_~]/g, " ").slice(0, 150));
            vistos++;
        }
    }
    if (datos?.theft_alert) lineas.push("⚠️ Posible alerta de robo: verificar en SUNARP");
    if (!vistos) lineas.push("La API no devolvió características reconocibles.");
    lineas.push("Fuente: SUNARP mediante Croma.");
    return lineas.join("\n");
}

function imagenCroma(datos) {
    // La API devuelve document_url como PNG original de SUNARP.
    if (datos?.found === false || typeof datos?.document_url !== "string") return null;
    try {
        const url = new URL(datos.document_url);
        const host = url.hostname.toLowerCase();
        if (url.protocol !== "https:" || url.username || url.password) return null;
        if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) return null;
        if (/^\d+(\.\d+){3}$/.test(host)) return null;
        if (host === "localhost" || /\.(local|localhost|internal)$/.test(host)) return null;
        if (url.port && url.port !== "443") return null;
        return url.toString();
    } catch {
        return null;
    }
}

module.exports = { consultarCroma, formatearCroma, imagenCroma };
