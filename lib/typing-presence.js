"use strict";

// La presencia "composing" dura pocos segundos: renovar hasta entregar respuesta.
// Los errores de presencia no deben interrumpir la respuesta de la IA.
function crearIndicadorEscritura({ intervaloMs = 8000 } = {}) {
    const activos = new Map();

    async function enviar(sock, jid, estado) {
        if (typeof sock.sendPresenceUpdate !== "function") return;
        try {
            await sock.sendPresenceUpdate(estado, jid);
        } catch (err) {
            console.warn("No se pudo actualizar la presencia de WhatsApp:", err.message);
        }
    }

    async function ejecutar(sock, jid, tarea) {
        let estado = activos.get(jid);
        if (!estado) {
            estado = { pendientes: 0, intervalo: null };
            activos.set(jid, estado);
        }
        estado.pendientes++;
        try {
            if (estado.pendientes === 1) {
                await enviar(sock, jid, "composing");
                // Evita que WhatsApp quite la animación mientras se genera un PDF o imagen.
                estado.intervalo = setInterval(() => {
                    if (activos.get(jid) === estado && estado.pendientes > 0) {
                        void enviar(sock, jid, "composing");
                    }
                }, intervaloMs);
                estado.intervalo.unref?.();
            }
            return await tarea();
        } finally {
            estado.pendientes--;
            if (estado.pendientes <= 0) {
                if (estado.intervalo) clearInterval(estado.intervalo);
                activos.delete(jid);
                await enviar(sock, jid, "paused");
            }
        }
    }

    return { ejecutar };
}

module.exports = { crearIndicadorEscritura };
