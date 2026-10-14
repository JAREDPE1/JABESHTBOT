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
    if (datos?.found === false || typeof datos?.document_url !== "string") return null;
    try {
        const u = new URL(datos.document_url);
        return u.protocol === "https:" && (u.hostname === "storage.googleapis.com" || u.hostname.endsWith(".usecroma.com") || u.hostname.endsWith(".croma.run")) ? u.toString() : null;
    } catch { return null; }
}
module.exports = { consultarCroma, formatearCroma, imagenCroma };
