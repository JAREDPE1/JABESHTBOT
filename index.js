const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadMediaMessage
} = require("@whiskeysockets/baileys");

const pino     = require("pino");
const qrcode   = require("qrcode-terminal");
const ytSearch = require("yt-search");
const fs       = require("fs");
const path     = require("path");
const https    = require("https");
const http     = require("http");
const axios    = require("axios");
const { spawn } = require("child_process");
require("dotenv").config();

const { startMenuText, botMenuText, menuImagePath, hasMenuImage } = require("./menu/menu");
const {
    getDocumentType,
    hasAiConfig,
    responderPreguntaIa,
    generarDocumentoAcademico,
} = require("./lib/ai-service");
const {
    crearDocumentoWord,
    documentoATexto,
} = require("./lib/docx-service");
const {
    crearDocumentoPptx,
} = require("./lib/pptx-service");

const IS_WINDOWS = process.platform === "win32";
const DATA_DIR = process.env.DATA_DIR || __dirname;
const AUTH_DIR = process.env.AUTH_DIR || path.join(DATA_DIR, "sesion");

// ─── Carpeta temporal ─────────────────────────────────────────────────────────
const TMP = process.env.TMP_DIR || path.join(DATA_DIR, "tmp");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// ─── Binarios multiplataforma ─────────────────────────────────────────────────
function resolverBinario(nombre, nombreWindows) {
    const envName = `${nombre.toUpperCase().replace(/-/g, "_")}_PATH`;
    if (process.env[envName]) return process.env[envName];

    const localWindows = path.join(__dirname, nombreWindows);
    if (IS_WINDOWS && fs.existsSync(localWindows)) return localWindows;

    const localLinux = path.join(__dirname, nombre);
    if (!IS_WINDOWS && fs.existsSync(localLinux)) return localLinux;

    return nombre;
}

const YTDLP = resolverBinario("yt-dlp", "yt-dlp.exe");
const FFMPEG = resolverBinario("ffmpeg", "ffmpeg.exe");

function tieneRutaLocalOBsoluta(binario) {
    return path.isAbsolute(binario) || binario.includes("/") || binario.includes("\\");
}

// Ejecuta yt-dlp usando spawn sin depender de .exe de Windows.
function runYtdlp(args, timeoutMs = 180_000) {
    const extraArgs = [];
    if (tieneRutaLocalOBsoluta(FFMPEG)) {
        extraArgs.push("--ffmpeg-location", fs.existsSync(FFMPEG) ? path.dirname(FFMPEG) : FFMPEG);
    }
    extraArgs.push("--js-runtimes", "node");
    const finalArgs = [...extraArgs, ...args];

    return new Promise((resolve, reject) => {
        const proc = spawn(YTDLP, finalArgs, {
            windowsHide: true,
            shell: false,
        });
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", d => { stdout += d.toString(); });
        proc.stderr.on("data", d => { stderr += d.toString(); });
        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error("Timeout yt-dlp"));
        }, timeoutMs);
        proc.on("close", code => {
            clearTimeout(timer);
            if (code === 0) resolve(stdout);
            else reject(new Error(stderr.slice(-1000) || `yt-dlp salió con código ${code}`));
        });
        proc.on("error", err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

function ytdlpDisponible() {
    return !tieneRutaLocalOBsoluta(YTDLP) || fs.existsSync(YTDLP);
}

// ─── Sesiones activas ─────────────────────────────────────────────────────────
const sesiones = new Map();
let reconectando = false;
let kickMonitorTimer = null;
let kickLiveAnterior = null;
let tiktokMonitorTimer = null;

// Configuracion simple para avisos de Kick.
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CONFIG_FILE = path.join(DATA_DIR, "bot-config.json");
const TIKTOK_STATE_FILE = path.join(DATA_DIR, "tiktok-state.json");
const KICK_SLUG = "anflo1";
const KICK_CHECK_MS = 60_000;
const TIKTOK_CHECK_MS = 5 * 60_000;
const BOT_NAME = "JABESHT - BOT";
const BOT_HEADER = `*${BOT_NAME}*`;
const DEFAULT_DNI_API_URL = "https://api.verificape.com/v2/dni/{dni}";

function cargarConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) return {};
        return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch (err) {
        console.error("Error leyendo config:", err.message);
        return {};
    }
}

function guardarConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

const botConfig = cargarConfig();

function cargarEstadoTiktok() {
    try {
        if (!fs.existsSync(TIKTOK_STATE_FILE)) return {};
        return JSON.parse(fs.readFileSync(TIKTOK_STATE_FILE, "utf8"));
    } catch (err) {
        console.error("Error leyendo estado TikTok:", err.message);
        return {};
    }
}

function guardarEstadoTiktok(estado) {
    fs.writeFileSync(TIKTOK_STATE_FILE, JSON.stringify(estado, null, 2));
}

function ponerMarcaBot(texto) {
    if (typeof texto !== "string" || texto.startsWith(BOT_HEADER) || texto.includes(BOT_NAME)) return texto;
    return `${BOT_HEADER}\n\n${texto}`;
}

function activarMarcaBot(sock) {
    const enviarOriginal = sock.sendMessage.bind(sock);
    sock.sendMessage = (jid, contenido, opciones) => {
        const marcado = { ...contenido };
        if (typeof marcado.text === "string") marcado.text = ponerMarcaBot(marcado.text);
        if (typeof marcado.caption === "string") marcado.caption = ponerMarcaBot(marcado.caption);
        return enviarOriginal(jid, marcado, opciones);
    };
}

function iniciarHealthServer() {
    const port = process.env.PORT;
    if (!port) return;

    const server = http.createServer((req, res) => {
        if (req.url === "/health" || req.url === "/") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                ok: true,
                bot: BOT_NAME,
                platform: process.platform,
                uptime: process.uptime(),
            }));
            return;
        }

        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
    });

    server.listen(Number(port), "0.0.0.0", () => {
        console.log(`🌐 Health server escuchando en puerto ${port}`);
    });
}

function configurarApagadoLimpio() {
    const apagar = (signal) => {
        console.log(`Recibido ${signal}. Cerrando monitores...`);
        detenerMonitorKick();
        detenerMonitorTiktok();
        process.exit(0);
    };

    process.once("SIGTERM", () => apagar("SIGTERM"));
    process.once("SIGINT", () => apagar("SIGINT"));
}

// ─── Bot ──────────────────────────────────────────────────────────────────────
async function startBot() {
    console.log("🚀 INICIANDO BOT...");

    console.log(`🖥️  Plataforma: ${process.platform}`);
    console.log(`📁 DATA_DIR: ${DATA_DIR}`);
    console.log(`🔐 AUTH_DIR: ${AUTH_DIR}`);
    console.log(`▶ yt-dlp: ${YTDLP}`);
    console.log(`▶ ffmpeg: ${FFMPEG}`);

    if (!ytdlpDisponible()) {
        console.warn("⚠️  NO se encontró yt-dlp. En Linux instala yt-dlp o define YT_DLP_PATH.");
    } else if (process.env.YTDLP_AUTO_UPDATE === "true") {
        try {
            await runYtdlp(["-U"]);
            console.log("✅ yt-dlp actualizado.");
        } catch (err) {
            console.log("ℹ️  yt-dlp no pudo actualizarse:", err.message);
        }
    }

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        keepAliveIntervalMs: 30_000,
    });
    activarMarcaBot(sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("\n📱 Escanea este QR:\n");
            qrcode.generate(qr, { small: true });
        }
        if (connection === "open") {
            reconectando = false;
            console.log("✅ BOT CONECTADO:", sock.user?.id);
            iniciarMonitorKick(sock);
            iniciarMonitorTiktok(sock);
        }
        if (connection === "close") {
            detenerMonitorKick();
            detenerMonitorTiktok();
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
                console.log("⚠️  Sesión cerrada. Borra /auth y reinicia.");
            } else if (!reconectando) {
                reconectando = true;
                console.log("🔄 Reconectando en 5s...");
                setTimeout(() => { reconectando = false; startBot(); }, 5000);
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid  = msg.key.remoteJid;
        const rawText = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption || ""
        ).trim();
        const text = rawText.toLowerCase();

        if (!text) return;
        console.log(`📩 [${jid.split("@")[0]}]: ${text}`);

        // ── Sesión activa ────────────────────────────────────────────────────
        if (sesiones.has(jid)) {
            const sesion = sesiones.get(jid);

            if (sesion.tipo === "lista") {
                const num = parseInt(text);
                if (!isNaN(num) && num >= 1 && num <= sesion.datos.length) {
                    const elegido = sesion.datos[num - 1];
                    sesiones.delete(jid);
                    await preguntarFormato(sock, jid, elegido);
                } else {
                    sesiones.delete(jid);
                    await sock.sendMessage(jid, { text: "↩️ Búsqueda cancelada." });
                }
                return;
            }

            if (sesion.tipo === "formato") {
                const { url, title, duracion } = sesion.datos;
                if (text === "1" || text === "mp3" || text === "audio") {
                    sesiones.delete(jid);
                    await sock.sendMessage(jid, { text: "⏳ Descargando *MP3*..." });
                    await descargarAudio(sock, jid, url, title, duracion);
                } else if (text === "2" || text === "mp4" || text === "video") {
                    sesiones.delete(jid);
                    await sock.sendMessage(jid, { text: "⏳ Descargando *MP4*..." });
                    await descargarVideo(sock, jid, url, title);
                } else {
                    sesiones.delete(jid);
                    await sock.sendMessage(jid, { text: "↩️ Cancelado." });
                }
                return;
            }
        }

        // ── Comandos ─────────────────────────────────────────────────────────

        if (text === "hola" || text === "!start") {
            const message = hasMenuImage
                ? { image: fs.readFileSync(menuImagePath), caption: startMenuText }
                : { text: startMenuText };
            await sock.sendMessage(jid, message);
            return;
        }

        if (text === "!menu" || text === "!ayuda") {
            const message = hasMenuImage
                ? { image: fs.readFileSync(menuImagePath), caption: botMenuText }
                : { text: botMenuText };
            await sock.sendMessage(jid, message);
            return;
        }

        if (text === ".creador" || text === "!creador") {
            await sock.sendMessage(jid, {
                text: `*Creditos del bot*\n\n*Creador:* Jared Crz\n*WhatsApp:* wa.me/51957211832\n\n*Colaborador:* Abraham LZ\n*WhatsApp:* wa.me/51915149840`
            });
            return;
        }

        if (/^!ia(\s|$)/.test(text)) {
            const pregunta = rawText.replace(/^!ia/i, "").trim();
            await responderIaComando(sock, jid, pregunta);
            return;
        }

        const comandoDocumentoIa = detectarComandoDocumentoIa(text);
        if (comandoDocumentoIa) {
            const tema = rawText.replace(new RegExp(`^!${comandoDocumentoIa.tipo}(?:-(?:pptx?)|\\s+pptx?)?`, "i"), "").trim();
            await generarDocumentoIaComando(sock, jid, comandoDocumentoIa.tipo, tema, comandoDocumentoIa.formato);
            return;
        }

        if (text === "!ping") {
            await sock.sendMessage(jid, { text: crearMensajePing(msg) });
            return;
        }

        if (text === "!estado") {
            await sock.sendMessage(jid, { text: crearMensajeEstado() });
            return;
        }

        if (/^!dni(\s|$)/.test(text)) {
            const dni = rawText.replace(/^!dni/i, "").trim();
            await consultarDniComando(sock, jid, dni);
            return;
        }

        if (text === "!s" || text === "!sticker") {
            await crearStickerComando(sock, jid, msg);
            return;
        }

        if (text === "!activarkick") {
            if (!jid.endsWith("@g.us")) {
                await sock.sendMessage(jid, { text: "Este comando debes usarlo dentro del grupo de WhatsApp donde quieres recibir los avisos." });
                return;
            }

            botConfig.kickGroupJid = jid;
            botConfig.kickSlug = KICK_SLUG;
            guardarConfig(botConfig);

            await sock.sendMessage(jid, {
                text: `Listo. Este grupo recibira avisos cuando *${KICK_SLUG}* prenda stream en Kick.\nhttps://kick.com/${KICK_SLUG}`
            });
            iniciarMonitorKick(sock);
            return;
        }

        if (text === "!verkick") {
            try {
                const stream = await obtenerEstadoKick(KICK_SLUG);
                if (stream.isLive) {
                    await enviarAvisoKick(sock, jid, stream);
                } else {
                    await sock.sendMessage(jid, { text: `*${KICK_SLUG}* no esta en vivo ahora.\nhttps://kick.com/${KICK_SLUG}` });
                }
            } catch (err) {
                console.error("Error !verkick:", err.message);
                await sock.sendMessage(jid, { text: "No pude revisar Kick ahora. Intenta de nuevo en unos minutos." });
            }
            return;
        }

        if (text.startsWith("!activartiktok")) {
            if (!jid.endsWith("@g.us")) {
                await sock.sendMessage(jid, { text: "Este comando debes usarlo dentro del grupo de WhatsApp donde quieres recibir los avisos de TikTok." });
                return;
            }

            const usuario = limpiarUsuarioTiktok(text.replace("!activartiktok", "").trim());
            if (!usuario) {
                await sock.sendMessage(jid, { text: "Uso: *!activartiktok @usuario*\nEjemplo: *!activartiktok @tiktok*" });
                return;
            }

            botConfig.tiktokGroupJid = jid;
            botConfig.tiktokUsername = usuario;
            guardarConfig(botConfig);

            detenerMonitorTiktok();
            await inicializarEstadoTiktok(usuario);
            iniciarMonitorTiktok(sock);

            await sock.sendMessage(jid, {
                text: `Listo. Este grupo recibira avisos cuando *@${usuario}* publique un video nuevo en TikTok.\nhttps://www.tiktok.com/@${usuario}`
            });
            return;
        }

        if (text === "!vertiktok") {
            if (!botConfig.tiktokUsername) {
                await sock.sendMessage(jid, { text: "Aun no hay usuario de TikTok configurado. Usa *!activartiktok @usuario* dentro del grupo." });
                return;
            }

            try {
                const video = await obtenerUltimoVideoTiktok(botConfig.tiktokUsername);
                await sock.sendMessage(jid, { text: crearMensajeTiktok(video) });
            } catch (err) {
                console.error("Error !vertiktok:", err.message);
                await sock.sendMessage(jid, { text: "No pude revisar TikTok ahora. Intenta de nuevo en unos minutos." });
            }
            return;
        }

        if (text.startsWith("!yt ") || text.startsWith("!video ") || text.startsWith("!fb ") || text.startsWith("!facebook ") || text.startsWith("!tiktok ") || text.startsWith("!tt ")) {
            const url = extraerUrlComando(rawText);
            if (!esUrlDescargable(url)) {
                await sock.sendMessage(jid, { text: "❌ URL inválida. Usa un enlace de YouTube, TikTok o Facebook." });
                return;
            }
            try {
                const info = await obtenerInfoVideo(url);
                await preguntarFormato(sock, jid, info);
            } catch (err) {
                console.error("Error descarga por URL:", err.message);
                await sock.sendMessage(jid, { text: "❌ No pude obtener info de ese video. Puede ser privado, restringido o requerir iniciar sesión." });
            }
            return;
        }

        if (text.startsWith("!play ")) {
            const query = text.slice(8).trim();
            if (!query) {
                await sock.sendMessage(jid, { text: "❌ Escribe qué buscar. Ej: *!buscar bohemian rhapsody*" });
                return;
            }
            await buscarMejor(sock, jid, query);
            return;
        }

        if (text.startsWith("!lista ")) {
            const query = text.slice(7).trim();
            if (!query) {
                await sock.sendMessage(jid, { text: "❌ Escribe qué buscar. Ej: *!lista bad bunny*" });
                return;
            }
            await mostrarLista(sock, jid, query);
            return;
        }
    });
}

// ─── Obtener info de video con yt-dlp ─────────────────────────────────────────
function detectarComandoDocumentoIa(text) {
    const match = text.match(/^!(monografia|ensayo|resumen|exposicion|introduccion|conclusion|objetivos)(?:-(pptx?)|\s+(pptx?))?(?=\s|$)/i);
    if (!match) return null;
    return {
        tipo: match[1].toLowerCase(),
        formato: match[2] || match[3] ? "pptx" : "docx",
    };
}

async function responderIaComando(sock, jid, pregunta) {
    if (!pregunta) {
        await sock.sendMessage(jid, { text: "Uso: *!ia pregunta*\nEjemplo: *!ia Que es la inteligencia artificial?*" });
        return;
    }

    if (!hasAiConfig()) {
        await sock.sendMessage(jid, { text: "La IA aun no esta configurada. Define *GEMINI_API_KEY* u *OPENAI_API_KEY* en el archivo .env." });
        return;
    }

    try {
        console.log("IA: respondiendo pregunta");
        await sock.sendMessage(jid, { text: "Pensando respuesta con IA..." });
        const respuesta = await responderPreguntaIa(pregunta);
        await enviarTextoLargo(sock, jid, respuesta);
    } catch (err) {
        console.error("Error !ia:", obtenerDetalleErrorIa(err));
        await sock.sendMessage(jid, { text: crearMensajeErrorIa(err) });
    }
}

async function generarDocumentoIaComando(sock, jid, tipo, tema, formato = "docx") {
    const config = getDocumentType(tipo);
    if (!config) return;

    if (!tema) {
        const comandoEjemplo = formato === "pptx" ? `!${tipo}-pptx` : `!${tipo}`;
        await sock.sendMessage(jid, { text: `Uso: *${comandoEjemplo} tema*\nEjemplo: *${comandoEjemplo} La inteligencia artificial*` });
        return;
    }

    if (!hasAiConfig()) {
        await sock.sendMessage(jid, { text: "La IA aun no esta configurada. Define *GEMINI_API_KEY* u *OPENAI_API_KEY* en el archivo .env." });
        return;
    }

    let archivo = null;
    try {
        console.log(`IA: generando ${tipo} sobre ${tema}`);
        await sock.sendMessage(jid, { text: `Generando ${config.label}...\nEsto puede tardar unos segundos...` });

        const documento = await generarDocumentoAcademico(tipo, tema);
        const texto = documentoATexto(documento);
        await enviarTextoLargo(sock, jid, texto);

        await sock.sendMessage(jid, { text: `Creando documento ${formato === "pptx" ? "PowerPoint" : "Word"}...` });
        if (formato === "pptx") {
            archivo = await crearDocumentoPptx(documento, TMP);
        } else {
            archivo = await crearDocumentoWord(documento, TMP);
        }

        await sock.sendMessage(jid, {
            document: fs.readFileSync(archivo.filePath),
            mimetype: archivo.mimetype,
            fileName: archivo.fileName,
        });
        console.log(`IA: documento enviado ${archivo.fileName}`);
    } catch (err) {
        console.error(`Error !${tipo}:`, obtenerDetalleErrorIa(err));
        await sock.sendMessage(jid, { text: crearMensajeErrorIa(err) });
    } finally {
        if (archivo?.filePath) {
            try { if (fs.existsSync(archivo.filePath)) fs.unlinkSync(archivo.filePath); } catch {}
        }
    }
}

async function enviarTextoLargo(sock, jid, texto, maxLength = 3500) {
    const partes = dividirTextoWhatsApp(texto, maxLength);
    for (const parte of partes) {
        await sock.sendMessage(jid, { text: parte });
    }
}

function dividirTextoWhatsApp(texto, maxLength = 3500) {
    const limpio = String(texto || "").trim();
    if (!limpio) return ["Sin contenido generado."];

    const partes = [];
    let actual = "";
    for (const bloque of limpio.split(/\n{2,}/)) {
        const candidato = actual ? `${actual}\n\n${bloque}` : bloque;
        if (candidato.length <= maxLength) {
            actual = candidato;
            continue;
        }

        if (actual) partes.push(actual);
        if (bloque.length <= maxLength) {
            actual = bloque;
            continue;
        }

        for (let i = 0; i < bloque.length; i += maxLength) {
            partes.push(bloque.slice(i, i + maxLength));
        }
        actual = "";
    }
    if (actual) partes.push(actual);
    return partes;
}

function crearMensajeErrorIa(err) {
    if (err.message === "OPENAI_API_KEY_MISSING") return "La IA aun no esta configurada. Define *OPENAI_API_KEY* en el archivo .env.";
    if (err.message === "GEMINI_API_KEY_MISSING") return "La IA aun no esta configurada. Define *GEMINI_API_KEY* en el archivo .env.";
    if (err.message === "IA_EMPTY_INPUT") return "Escribe un tema o pregunta despues del comando.";
    if (err.message === "OPENAI_INVALID_JSON") return "La IA genero una respuesta con formato invalido. Intenta de nuevo con un tema mas especifico.";
    if (err.message === "GEMINI_EMPTY_RESPONSE") return "Gemini no devolvio texto. Intenta otra vez con un tema mas especifico.";
    if (err.code === "ECONNABORTED") return "La IA tardo demasiado en responder. Intenta otra vez en unos minutos.";

    const status = err.response?.status;
    if (status === 400) return "La API de IA rechazo la solicitud. Revisa el modelo configurado.";
    if (status === 401 || status === 403) return "La API de IA rechazo la key. Revisa la clave en el .env.";
    if (status === 429) return "La API de IA limito las solicitudes o no hay cuota disponible.";
    if (status >= 500) return "La API de IA esta fallando temporalmente. Intenta mas tarde.";

    return "No pude generar la respuesta con IA ahora. Revisa la configuracion o intenta mas tarde.";
}

function obtenerDetalleErrorIa(err) {
    return err.response?.data?.error?.message || err.response?.data?.message || err.message;
}

function crearMensajePing(msg) {
    const timestamp = Number(msg.messageTimestamp || 0) * 1000;
    const latencia = timestamp > 0 ? Math.max(0, Date.now() - timestamp) : null;
    return latencia === null
        ? "🏓 Pong! Bot activo."
        : `🏓 Pong!\n⚡ Latencia: ${latencia} ms`;
}

function crearMensajeEstado() {
    const memoria = process.memoryUsage();
    const uptime = formatearDuracion(process.uptime());
    const rssMB = memoria.rss / (1024 * 1024);
    const heapMB = memoria.heapUsed / (1024 * 1024);

    return [
        "*Estado del bot*",
        "",
        `🤖 Bot: ${BOT_NAME}`,
        `⏱️ Encendido: ${uptime}`,
        `💾 Memoria: ${rssMB.toFixed(1)}MB RSS / ${heapMB.toFixed(1)}MB heap`,
        `🖥️ Sistema: ${process.platform}`,
        `📁 DATA_DIR: ${DATA_DIR}`,
        `▶️ yt-dlp: ${ytdlpDisponible() ? "OK" : "No encontrado"}`,
        `🎬 ffmpeg: ${ffmpegDisponible() ? "OK" : "No encontrado"}`,
        `🟢 Kick monitor: ${kickMonitorTimer ? "activo" : "apagado"}`,
        `🎵 TikTok monitor: ${tiktokMonitorTimer ? "activo" : "apagado"}`,
    ].join("\n");
}

function formatearDuracion(segundosTotales) {
    const total = Math.floor(segundosTotales);
    const dias = Math.floor(total / 86400);
    const horas = Math.floor((total % 86400) / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const segundos = total % 60;
    const partes = [];
    if (dias) partes.push(`${dias}d`);
    if (horas) partes.push(`${horas}h`);
    if (minutos) partes.push(`${minutos}m`);
    partes.push(`${segundos}s`);
    return partes.join(" ");
}

function ffmpegDisponible() {
    return !tieneRutaLocalOBsoluta(FFMPEG) || fs.existsSync(FFMPEG);
}

async function consultarDniComando(sock, jid, dni) {
    if (!/^\d{8}$/.test(dni)) {
        await sock.sendMessage(jid, { text: "Uso: *!dni 12345678*\nDebe tener 8 digitos." });
        return;
    }

    const dniApiUrl = obtenerDniApiUrl();
    if (!dniApiUrl || !process.env.DNI_API_TOKEN) {
        await sock.sendMessage(jid, {
            text: "La consulta DNI aun no esta configurada.\n\nDefine *DNI_API_TOKEN* en el .env con tu API key de VerificaPE."
        });
        return;
    }

    try {
        const data = await consultarDniApi(dni, dniApiUrl);
        await sock.sendMessage(jid, { text: formatearRespuestaDni(dni, data) });
    } catch (err) {
        const estado = err.response?.status;
        const detalle = err.response?.data?.message || err.response?.data?.error || err.message;
        console.error("Error !dni:", estado || "", detalle);
        await sock.sendMessage(jid, { text: crearMensajeErrorDni(estado) });
    }
}

function obtenerDniApiUrl() {
    return (process.env.DNI_API_URL || DEFAULT_DNI_API_URL).trim();
}

async function consultarDniApi(dni, dniApiUrl = obtenerDniApiUrl()) {
    const apiUrl = dniApiUrl.includes("{dni}")
        ? dniApiUrl.replaceAll("{dni}", encodeURIComponent(dni))
        : `${dniApiUrl.replace(/\/$/, "")}/${encodeURIComponent(dni)}`;

    const headers = {
        "Accept": "application/json",
        "User-Agent": "JABESHT-BOT/1.0"
    };
    if (process.env.DNI_API_TOKEN) headers.Authorization = `Bearer ${process.env.DNI_API_TOKEN}`;

    const { data } = await axios.get(apiUrl, { timeout: 12_000, headers });
    return data;
}

function crearMensajeErrorDni(estado) {
    if (estado === 401 || estado === 403) return "No pude consultar DNI: la API key fue rechazada. Revisa *DNI_API_TOKEN*.";
    if (estado === 404) return "No pude consultar DNI: la ruta de la API no existe. Revisa *DNI_API_URL*.";
    if (estado === 429) return "No pude consultar DNI: se agotaron o limitaron las consultas de la API.";
    return "No pude consultar ese DNI ahora. Puede que el DNI puesto no exista.";
}

function formatearRespuestaDni(dni, data) {
    const payload = data?.data || data?.result || data?.persona || data;
    const nombres = extraerCampo(payload, ["nombres", "nombre", "names", "prenombres"]);
    const apellidoPaterno = extraerCampo(payload, ["apellidoPaterno", "apellido_paterno", "paternalSurname", "apepat", "paterno"]);
    const apellidoMaterno = extraerCampo(payload, ["apellidoMaterno", "apellido_materno", "maternalSurname", "apemat", "materno"]);
    const nombreCompleto = extraerCampo(payload, ["nombreCompleto", "nombre_completo", "fullName", "fullname"]);
    const fechaNacimiento = extraerCampo(payload, ["fechaNacimiento", "fecha_nacimiento", "birthDate"]);
    const genero = extraerCampo(payload, ["genero", "sexo", "gender"]);
    const fuente = extraerCampo(payload, ["fuente", "source"]);

    const lineas = [
        "*Consulta DNI*",
        "",
        `🪪 DNI: ${dni}`,
    ];

    if (nombreCompleto) lineas.push(`👤 Nombre Completo: ${nombreCompleto}`);
    
    if (nombres) lineas.push(`👤 Nombre: ${nombres}`);

    if (apellidoPaterno) lineas.push(`📌 Apellido paterno: ${apellidoPaterno}`);

    if (apellidoMaterno) lineas.push(`📌 Apellido materno: ${apellidoMaterno}`);

    if (fechaNacimiento) lineas.push(`Nacimiento: ${fechaNacimiento}`);

    if (genero) lineas.push(`Genero: ${genero}`);

    if (fuente) lineas.push(`JABESHT BOT: ${fuente}`);

    if (lineas.length === 3) lineas.push("La API respondio, pero no encontre campos de nombre reconocibles.");
    return lineas.join("\n");
}

function extraerCampo(obj, nombres) {
    if (!obj || typeof obj !== "object") return null;
    for (const nombre of nombres) {
        const valor = obj[nombre];
        if (valor !== undefined && valor !== null && String(valor).trim()) return String(valor).trim();
    }
    return null;
}

async function crearStickerComando(sock, jid, msg) {
    if (!ffmpegDisponible()) {
        await sock.sendMessage(jid, { text: "No encontre ffmpeg. Configura *FFMPEG_PATH* para crear stickers." });
        return;
    }

    const mediaMsg = obtenerMensajeMedia(msg);
    if (!mediaMsg) {
        await sock.sendMessage(jid, { text: "Responde a una imagen/video con *!s* o envia una imagen/video con caption *!s*." });
        return;
    }

    const tipo = mediaMsg.message?.imageMessage ? "image" : "video";
    const mimetype = mediaMsg.message?.imageMessage?.mimetype || mediaMsg.message?.videoMessage?.mimetype || "";
    const extension = mimetype.includes("png") ? ".png" : mimetype.includes("webp") ? ".webp" : tipo === "video" ? ".mp4" : ".jpg";
    const base = path.join(TMP, `sticker_${Date.now()}`);
    const entrada = `${base}${extension}`;
    const salida = `${base}.webp`;

    try {
        const buffer = await downloadMediaMessage(
            mediaMsg,
            "buffer",
            {},
            {
                logger: pino({ level: "silent" }),
                reuploadRequest: sock.updateMediaMessage,
            }
        );

        fs.writeFileSync(entrada, buffer);
        await convertirASticker(entrada, salida, tipo);

        await sock.sendMessage(jid, {
            sticker: fs.readFileSync(salida),
        });
    } catch (err) {
        console.error("Error !s:", err.message);
        await sock.sendMessage(jid, { text: "No pude crear el sticker. Prueba con otra imagen o un video corto." });
    } finally {
        try { if (fs.existsSync(entrada)) fs.unlinkSync(entrada); } catch {}
        try { if (fs.existsSync(salida)) fs.unlinkSync(salida); } catch {}
    }
}

function obtenerMensajeMedia(msg) {
    const directo = normalizarMensajeMedia(msg.message);
    if (directo) return { key: msg.key, message: directo };

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo;
    const quoted = normalizarMensajeMedia(contextInfo?.quotedMessage);
    if (!quoted) return null;

    return {
        key: {
            remoteJid: msg.key.remoteJid,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant,
        },
        message: quoted,
    };
}

function normalizarMensajeMedia(message) {
    if (!message) return null;
    const contenido = message.ephemeralMessage?.message ||
        message.viewOnceMessage?.message ||
        message.viewOnceMessageV2?.message ||
        message.documentWithCaptionMessage?.message ||
        message;

    if (contenido.imageMessage || contenido.videoMessage) return contenido;
    return null;
}

function convertirASticker(entrada, salida, tipo) {
    const filtroImagen = "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000";
    const filtroVideo = `fps=15,${filtroImagen}`;
    const args = tipo === "video"
        ? ["-y", "-i", entrada, "-t", "6", "-vf", filtroVideo, "-vcodec", "libwebp", "-lossless", "0", "-q:v", "65", "-preset", "default", "-loop", "0", "-an", "-vsync", "0", salida]
        : ["-y", "-i", entrada, "-vf", filtroImagen, "-vcodec", "libwebp", "-lossless", "0", "-q:v", "80", "-preset", "default", "-loop", "0", "-an", "-vsync", "0", salida];

    return runProceso(FFMPEG, args, 60_000);
}

function runProceso(comando, args, timeoutMs = 60_000) {
    return new Promise((resolve, reject) => {
        const proc = spawn(comando, args, {
            windowsHide: true,
            shell: false,
        });
        let stderr = "";
        proc.stderr.on("data", d => { stderr += d.toString(); });
        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error("Timeout proceso"));
        }, timeoutMs);
        proc.on("close", code => {
            clearTimeout(timer);
            if (code === 0) resolve();
            else reject(new Error(stderr.slice(-1000) || `Proceso salio con codigo ${code}`));
        });
        proc.on("error", err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function obtenerInfoVideo(url) {
    const stdout = await runYtdlp(["--dump-json", "--no-playlist", url]);
    const info = JSON.parse(stdout.trim().split("\n")[0]);
    return {
        url:       info.webpage_url || info.original_url || url,
        title:     info.title || info.fulltitle || "Video",
        duracion:  Number(info.duration) || 0,
        thumbnail: info.thumbnail || null,
    };
}

function extraerUrlComando(texto) {
    return String(texto || "").trim().split(/\s+/).slice(1).join(" ").trim();
}

function esUrlDescargable(url) {
    try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) return false;
        const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
        return (
            host === "youtu.be" ||
            host.endsWith("youtube.com") ||
            host.endsWith("tiktok.com") ||
            host.endsWith("vm.tiktok.com") ||
            host.endsWith("vt.tiktok.com") ||
            host.endsWith("facebook.com") ||
            host.endsWith("fb.watch")
        );
    } catch {
        return false;
    }
}

// ─── Buscar el mejor resultado ────────────────────────────────────────────────
async function buscarMejor(sock, jid, query) {
    try {
        await sock.sendMessage(jid, { text: `🔍 Buscando: *${query}*...` });
        const { videos } = await ytSearch(query);
        const validos = (videos || []).filter(v => v.seconds > 0 && v.seconds <= 600);

        if (!validos.length) {
            await sock.sendMessage(jid, { text: "❌ No encontré resultados menores de 10 min." });
            return;
        }

        const v = validos[0];
        await preguntarFormato(sock, jid, {
            url:       v.url,
            title:     v.title,
            duracion:  v.seconds,
            thumbnail: v.thumbnail || null,
        });
    } catch (err) {
        console.error("Error buscarMejor:", err.message);
        await sock.sendMessage(jid, { text: "❌ Error al buscar. Intenta de nuevo." });
    }
}

// ─── Mostrar lista de 8 resultados ───────────────────────────────────────────
async function mostrarLista(sock, jid, query) {
    try {
        await sock.sendMessage(jid, { text: `🔍 Buscando opciones para: *${query}*...` });
        const { videos } = await ytSearch(query);
        const validos = (videos || []).filter(v => v.seconds > 0 && v.seconds <= 600).slice(0, 8);

        if (!validos.length) {
            await sock.sendMessage(jid, { text: "❌ No encontré resultados menores de 10 min." });
            return;
        }

        for (let i = 0; i < validos.length; i++) {
            const v = validos[i];
            const caption = `*${i + 1}.* ${v.title}\n👤 ${v.author.name}  ⏱ ${v.timestamp}`;
            try {
                const thumbBuffer = await descargarImagen(v.thumbnail);
                await sock.sendMessage(jid, { image: thumbBuffer, caption });
            } catch {
                await sock.sendMessage(jid, { text: caption });
            }
            await esperar(400);
        }

        await sock.sendMessage(jid, {
            text: `↩️ Responde con el *número* (1-${validos.length}) para elegir.\n_(Expira en 2 minutos)_`
        });

        sesiones.set(jid, { tipo: "lista", datos: validos });
        setTimeout(() => { if (sesiones.has(jid)) sesiones.delete(jid); }, 120_000);

    } catch (err) {
        console.error("Error mostrarLista:", err.message);
        await sock.sendMessage(jid, { text: "❌ Error al buscar. Intenta de nuevo." });
    }
}

// ─── Mostrar miniatura y preguntar formato ────────────────────────────────────
async function preguntarFormato(sock, jid, { url, title, duracion, thumbnail }) {
    const min = Math.floor(duracion / 60);
    const seg = String(duracion % 60).padStart(2, "0");
    const caption = `🎵 *${title}*\n⏱ ${min}:${seg}\n\n¿En qué formato?\n*1* — 🎵 MP3 (solo audio)\n*2* — 🎬 MP4 (video)`;

    try {
        const thumbBuffer = thumbnail ? await descargarImagen(thumbnail) : null;
        if (thumbBuffer) {
            await sock.sendMessage(jid, { image: thumbBuffer, caption });
        } else {
            await sock.sendMessage(jid, { text: caption });
        }
    } catch {
        await sock.sendMessage(jid, { text: caption });
    }

    sesiones.set(jid, { tipo: "formato", datos: { url, title, duracion, thumbnail } });
    setTimeout(() => { if (sesiones.has(jid)) sesiones.delete(jid); }, 120_000);
}

// ─── Descargar y enviar MP3 con yt-dlp ───────────────────────────────────────
async function descargarAudio(sock, jid, url, title, duracion) {
    const base    = path.join(TMP, `audio_${Date.now()}`);
    const archivo = `${base}.mp3`;
    try {
        const args = [
            "-x", "--audio-format", "mp3", "--audio-quality", "0",
            "--no-playlist",
            "-o", `${base}.%(ext)s`,
            url
        ];
        console.log("▶ yt-dlp audio:", args.join(" "));
        await runYtdlp(args, 120_000);

        if (!fs.existsSync(archivo)) {
            // A veces yt-dlp genera .m4a si no tiene ffmpeg; buscar alternativa
            const posibles = fs.readdirSync(TMP).filter(f => f.startsWith(path.basename(base)));
            if (!posibles.length) throw new Error("Archivo de audio no generado");
            const audioFile = path.join(TMP, posibles[0]);
            await sock.sendMessage(jid, {
                audio: fs.readFileSync(audioFile),
                mimetype: "audio/mp4",
                ptt: false,
                fileName: `${title}.m4a`,
            });
            fs.unlinkSync(audioFile);
        } else {
            await sock.sendMessage(jid, {
                audio: fs.readFileSync(archivo),
                mimetype: "audio/mpeg",
                ptt: false,
                fileName: `${title}.mp3`,
            });
            fs.unlinkSync(archivo);
        }

        const min = Math.floor(duracion / 60);
        const seg = String(duracion % 60).padStart(2, "0");
        await sock.sendMessage(jid, { text: `✅ *${title}*\n⏱ ${min}:${seg}` });

    } catch (err) {
        console.error("Error descargarAudio:", err.message);
        // Limpiar archivos huérfanos
        fs.readdirSync(TMP)
            .filter(f => f.startsWith(path.basename(base)))
            .forEach(f => { try { fs.unlinkSync(path.join(TMP, f)); } catch {} });
        await sock.sendMessage(jid, { text: "❌ No pude descargar el audio. Intenta con otro video.\n\n💡 Si el error persiste, asegúrate de tener *ffmpeg* instalado." });
    }
}

// ─── Descargar y enviar MP4 con yt-dlp ───────────────────────────────────────
async function descargarVideo(sock, jid, url, title) {
    const base    = path.join(TMP, `video_${Date.now()}`);
    const archivo = `${base}.mp4`;
    try {
        const args = [
            "-f", "bv*[height<=720]+ba/b[height<=720]/best[height<=720]/best",
            "--merge-output-format", "mp4",
            "--remux-video", "mp4",
            "--no-playlist",
            "-o", `${base}.%(ext)s`,
            url
        ];
        console.log("▶ yt-dlp video:", args.join(" "));
        await runYtdlp(args, 180_000);

        const videoFile = buscarArchivoGenerado(base, ".mp4") || buscarArchivoGenerado(base);
        if (!videoFile) throw new Error("Archivo de video no generado");

        const sizeMB = fs.statSync(videoFile).size / (1024 * 1024);
        if (sizeMB > 60) {
            await sock.sendMessage(jid, { 
                text: `⚠️ El video pesa ${sizeMB.toFixed(1)}MB (límite WhatsApp 64MB). Te envío el MP3.` 
            });
            limpiarArchivosGenerados(base);
            // Obtener duración real del archivo y enviar audio
            await descargarAudio(sock, jid, url, title, 0);
            return;
        }

        await sock.sendMessage(jid, {
            video: fs.readFileSync(videoFile),
            mimetype: "video/mp4",
            fileName: `${title}.mp4`,
        });
        await sock.sendMessage(jid, { text: `✅ *${title}*\n📦 ${sizeMB.toFixed(1)}MB` });
        limpiarArchivosGenerados(base);

    } catch (err) {
        console.error("Error descargarVideo:", err.message);
        limpiarArchivosGenerados(base);
        await sock.sendMessage(jid, { text: "❌ No pude descargar el video. Prueba con MP3." });
    }
}

function buscarArchivoGenerado(base, extensionPreferida = null) {
    const prefijo = path.basename(base);
    const archivos = fs.readdirSync(TMP)
        .filter(f => f.startsWith(prefijo))
        .map(f => path.join(TMP, f))
        .filter(f => fs.existsSync(f) && fs.statSync(f).isFile());

    if (extensionPreferida) {
        const preferido = archivos.find(f => path.extname(f).toLowerCase() === extensionPreferida);
        if (preferido) return preferido;
    }

    return archivos[0] || null;
}

function limpiarArchivosGenerados(base) {
    const prefijo = path.basename(base);
    try {
        fs.readdirSync(TMP)
            .filter(f => f.startsWith(prefijo))
            .forEach(f => {
                try { fs.unlinkSync(path.join(TMP, f)); } catch {}
            });
    } catch {}
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
// ─── Monitor Kick ───────────────────────────────────────────────────────────
function iniciarMonitorKick(sock) {
    if (kickMonitorTimer) return;

    if (!botConfig.kickGroupJid) {
        console.log("Kick: usa !setkickgroup en un grupo para activar avisos.");
        return;
    }

    console.log(`Kick: monitoreando https://kick.com/${KICK_SLUG} para ${botConfig.kickGroupJid}`);
    revisarKickYNotificar(sock).catch(err => console.error("Kick monitor:", err.message));
    kickMonitorTimer = setInterval(() => {
        revisarKickYNotificar(sock).catch(err => console.error("Kick monitor:", err.message));
    }, KICK_CHECK_MS);
}

function detenerMonitorKick() {
    if (!kickMonitorTimer) return;
    clearInterval(kickMonitorTimer);
    kickMonitorTimer = null;
}

async function revisarKickYNotificar(sock) {
    if (!botConfig.kickGroupJid) return;

    const stream = await obtenerEstadoKick(KICK_SLUG);

    if (kickLiveAnterior === null) {
        kickLiveAnterior = stream.isLive;
        return;
    }

    if (stream.isLive && !kickLiveAnterior) {
        await enviarAvisoKick(sock, botConfig.kickGroupJid, stream);
    }

    kickLiveAnterior = stream.isLive;
}

async function obtenerEstadoKick(slug) {
    const url = `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`;
    const { data } = await axios.get(url, {
        timeout: 12_000,
        headers: {
            "Accept": "application/json,text/html,*/*",
            "Referer": "https://kick.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
        }
    });

    const stream = data?.livestream || data?.stream || null;
    const isLive = Boolean(stream?.is_live || stream?.isLive || data?.is_live);

    return {
        isLive,
        slug: data?.slug || slug,
        title: stream?.session_title || stream?.stream_title || data?.stream_title || "Stream en vivo",
        category: stream?.categories?.[0]?.name || stream?.category?.name || data?.category?.name || null,
        viewers: stream?.viewer_count ?? stream?.viewers ?? data?.viewer_count ?? null,
        thumbnail: normalizarUrlImagen(
            stream?.thumbnail?.url ||
            stream?.thumbnail ||
            stream?.thumbnail_url ||
            data?.thumbnail ||
            data?.banner_image?.url ||
            data?.banner_image ||
            data?.offline_banner_image?.url ||
            data?.offline_banner_image
        ),
        url: `https://kick.com/${slug}`
    };
}

async function enviarAvisoKick(sock, jid, stream) {
    const caption = crearMensajeKick(stream);

    if (!stream.thumbnail) {
        await sock.sendMessage(jid, { text: caption });
        return;
    }

    try {
        const imagen = await descargarImagen(stream.thumbnail);
        await sock.sendMessage(jid, { image: imagen, caption });
    } catch (err) {
        console.error("Kick imagen:", err.message);
        await sock.sendMessage(jid, { text: caption });
    }
}

function crearMensajeKick(stream) {
    const viewersNumber = Number(stream.viewers);
    const viewers = stream.viewers === null || stream.viewers === undefined || Number.isNaN(viewersNumber)
        ? "No disponible"
        : viewersNumber.toLocaleString("es-PE");

    const partes = [
        `🔴 *${stream.slug.toUpperCase()} ESTA EN VIVO*`,
        "",
        `🎬 *Titulo:* ${stream.title}`,
        `👀 *Viewers:* ${viewers}`,
    ];

    if (stream.category) partes.push(`🎮 *Categoria:* ${stream.category}`);
    partes.push("");
    partes.push("🔥 Ya prendio stream en Kick. Caigan al directo:");
    partes.push(stream.url);

    return partes.join("\n");
}

function normalizarUrlImagen(url) {
    if (!url || typeof url !== "string") return null;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return `https://kick.com${url}`;
    return url;
}

// ─── Monitor TikTok ─────────────────────────────────────────────────────────
function iniciarMonitorTiktok(sock) {
    if (tiktokMonitorTimer) return;

    if (!botConfig.tiktokGroupJid || !botConfig.tiktokUsername) {
        console.log("TikTok: usa !activartiktok @usuario en un grupo para activar avisos.");
        return;
    }

    console.log(`TikTok: monitoreando @${botConfig.tiktokUsername} para ${botConfig.tiktokGroupJid}`);
    revisarTiktokYNotificar(sock).catch(err => console.error("TikTok monitor:", err.message));
    tiktokMonitorTimer = setInterval(() => {
        revisarTiktokYNotificar(sock).catch(err => console.error("TikTok monitor:", err.message));
    }, TIKTOK_CHECK_MS);
}

function detenerMonitorTiktok() {
    if (!tiktokMonitorTimer) return;
    clearInterval(tiktokMonitorTimer);
    tiktokMonitorTimer = null;
}

async function inicializarEstadoTiktok(username) {
    try {
        const video = await obtenerUltimoVideoTiktok(username);
        const estado = cargarEstadoTiktok();
        estado.usuarios = estado.usuarios || {};
        estado.usuarios[username] = {
            lastVideoId: video.id,
            lastUrl: video.url,
            updatedAt: new Date().toISOString()
        };
        guardarEstadoTiktok(estado);
    } catch (err) {
        console.error("TikTok init:", err.message);
    }
}

async function revisarTiktokYNotificar(sock) {
    if (!botConfig.tiktokGroupJid || !botConfig.tiktokUsername) return;

    const username = botConfig.tiktokUsername;
    const video = await obtenerUltimoVideoTiktok(username);
    const estado = cargarEstadoTiktok();
    estado.usuarios = estado.usuarios || {};

    const anterior = estado.usuarios[username]?.lastVideoId;
    if (!anterior) {
        estado.usuarios[username] = {
            lastVideoId: video.id,
            lastUrl: video.url,
            updatedAt: new Date().toISOString()
        };
        guardarEstadoTiktok(estado);
        return;
    }

    if (video.id === anterior) return;

    await sock.sendMessage(botConfig.tiktokGroupJid, { text: crearMensajeTiktok(video) });
    estado.usuarios[username] = {
        lastVideoId: video.id,
        lastUrl: video.url,
        updatedAt: new Date().toISOString()
    };
    guardarEstadoTiktok(estado);
}

async function obtenerUltimoVideoTiktok(username) {
    if (!ytdlpDisponible()) {
        throw new Error("yt-dlp no esta disponible");
    }

    const cleanUser = limpiarUsuarioTiktok(username);
    const perfilUrl = `https://www.tiktok.com/@${cleanUser}`;
    const stdout = await runYtdlp([
        "--dump-json",
        "--playlist-end", "1",
        "--no-warnings",
        perfilUrl
    ], 120_000);

    const videos = stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean)
        .flatMap(item => Array.isArray(item.entries) ? item.entries : [item])
        .filter(item => item && item.id);

    if (!videos.length) throw new Error(`No se encontro ultimo video de @${cleanUser}`);

    const video = videos[0];
    const id = String(video.id);
    const descripcion = video.description || video.title || "Sin descripcion";

    return {
        id,
        username: limpiarUsuarioTiktok(video.uploader_id || video.uploader || video.channel || cleanUser),
        description: descripcion,
        url: video.webpage_url || `https://www.tiktok.com/@${cleanUser}/video/${id}`,
        detectedAt: formatearFechaDeteccion()
    };
}

function crearMensajeTiktok(video) {
    return [
        "📢 *NUEVO VIDEO EN TIKTOK*",
        "",
        `👤 *Usuario:* @${video.username}`,
        `📝 *Descripcion:* ${video.description}`,
        `🔗 *URL:* ${video.url}`,
        `🕒 *Detectado:* ${video.detectedAt}`,
        "",
        "⚡ Detectado automaticamente por el bot"
    ].join("\n");
}

function limpiarUsuarioTiktok(usuario) {
    return String(usuario || "")
        .trim()
        .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, "")
        .replace(/^@/, "")
        .replace(/^\/?@?/, "")
        .split(/[/?#\s]/)[0]
        .replace(/[^a-zA-Z0-9._-]/g, "");
}

function formatearFechaDeteccion() {
    return new Date().toLocaleString("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function descargarImagen(url) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const req = https.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            }
        }, res => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                const nextUrl = new URL(res.headers.location, url).toString();
                descargarImagen(nextUrl).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) { reject(new Error("HTTP " + res.statusCode)); return; }
            res.on("data", c => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks)));
        });
        req.on("error", reject);
        req.setTimeout(8000, () => { req.destroy(); reject(new Error("Timeout")); });
    });
}

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

configurarApagadoLimpio();
iniciarHealthServer();
startBot().catch(err => {
    console.error("Error fatal iniciando bot:", err);
    process.exit(1);
});
