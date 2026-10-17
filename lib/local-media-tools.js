"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const MAX_VOICE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 90;

function enabled(value) {
    return String(value || "false").trim().toLowerCase() === "true";
}

function isBackgroundRequest(texto) {
    const clean = String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return /^(?:!quitarfondo|!sinfondo)(?:\s|$)/.test(clean) ||
        /(?:quita|quitale|elimina|borrale|remueve|saca|sacale)\s+(?:(?:el|le)\s+)?fondo\b/.test(clean) ||
        /\bsin fondo\b/.test(clean);
}

function voiceNote(msg) {
    const media = msg?.message?.ephemeralMessage?.message || msg?.message || {};
    const a = media.audioMessage;
    return a && a.ptt === true ? a : null;
}

function fileSize(media) {
    const input = media?.fileLength;
    if (typeof input === "number") return input;
    if (typeof input === "string") return Number(input) || 0;
    if (input && typeof input.toNumber === "function") return input.toNumber();
    return 0;
}

function checkVoiceMedia(audio, bytes = 0) {
    if (!audio?.ptt) throw new Error("VOICE_NOT_PTT");
    const secs = Number(audio.seconds || 0);
    if (secs > MAX_AUDIO_SECONDS) throw new Error("VOICE_TOO_LONG");
    const size = bytes || fileSize(audio);
    if (size > MAX_VOICE_BYTES) throw new Error("VOICE_TOO_BIG");
}

function checkImageMedia(image, bytes = 0) {
    const mime = String(image?.mimetype || "image/jpeg");
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("IMAGE_MIME");
    if ((bytes || fileSize(image)) > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_BIG");
    return mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
}

function getImageQuotedOrDirect(msg) {
    const media = msg?.message?.ephemeralMessage?.message || msg?.message || {};
    if (media.imageMessage) {
        return { key: msg.key, message: { imageMessage: media.imageMessage } };
    }
    const ctx = media.extendedTextMessage?.contextInfo || media.imageMessage?.contextInfo;
    if (!ctx?.quotedMessage?.imageMessage) return null;
    return {
        key: {
            remoteJid: msg.key.remoteJid,
            id: ctx.stanzaId,
            participant: ctx.participant,
        },
        message: { imageMessage: ctx.quotedMessage.imageMessage },
    };
}

function createBusyGate() {
    let busy = false;
    return {
        async run(task) {
            if (busy) throw new Error("MEDIA_BUSY");
            busy = true;
            try { return await task(); }
            finally { busy = false; }
        },
        isBusy() { return busy; },
    };
}

async function runProcess(bin, args, { timeoutMs = 120_000, maxStdout = 8192 } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(bin, args, { shell: false, windowsHide: true });
        let stdout = "", stderr = "", finished = false, timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, timeoutMs);
        function done(err) {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            if (err) reject(err); else resolve(stdout);
        }
        child.stdout?.on("data", c => { stdout = (stdout + c.toString()).slice(-maxStdout); });
        child.stderr?.on("data", c => { stderr = (stderr + c.toString()).slice(-2500); });
        child.on("error", err => done(err));
        child.on("close", code => {
            if (timedOut) return done(new Error("MEDIA_TIMEOUT"));
            if (code !== 0) return done(new Error("MEDIA_COMMAND_FAILED: " + (stderr || code)));
            done(null);
        });
    });
}

function pythonPath(env = process.env) {
    return env.MEDIA_PYTHON || path.join(__dirname, "..", ".venv-media", "bin", "python");
}

function rembgPath(env = process.env) {
    return env.REMBG_PATH || path.join(__dirname, "..", ".venv-media", "bin", "rembg");
}

async function transcribeVoice(buffer, options = {}) {
    if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_VOICE_BYTES) throw new Error("VOICE_TOO_BIG");
    const work = fs.mkdtempSync(path.join(options.tmp || os.tmpdir(), "jbot-voice-"));
    const input = path.join(work, "entrada.ogg");
    try {
        fs.writeFileSync(input, buffer, { mode: 0o600 });
        const tool = options.run || runProcess;
        const result = await tool(options.python || pythonPath(), [
            path.join(__dirname, "..", "scripts", "transcribe-audio.py"), input,
        ], { timeoutMs: 180_000 });
        const texto = String(result || "").trim();
        if (!texto) throw new Error("VOICE_NO_SPEECH");
        return texto.slice(0, 1600);
    } finally {
        fs.rmSync(work, { recursive: true, force: true });
    }
}

async function speakSpanish(texto, options = {}) {
    const work = fs.mkdtempSync(path.join(options.tmp || os.tmpdir(), "jbot-tts-"));
    const input = path.join(work, "texto.txt");
    const wav = path.join(work, "voz.wav");
    const ogg = path.join(work, "voz.ogg");
    try {
        // espeak-ng lee un archivo: nunca se ejecuta texto del usuario como opción CLI.
        fs.writeFileSync(input, String(texto || "").slice(0, 1800), { mode: 0o600 });
        const tool = options.run || runProcess;
        await tool(options.tts || process.env.ESPEAK_PATH || "espeak-ng",
            ["-v", "es", "-s", "150", "-f", input, "-w", wav], { timeoutMs: 40_000 });
        await tool(options.ffmpeg || process.env.FFMPEG_PATH || "ffmpeg",
            ["-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-ac", "1", "-c:a", "libopus",
                "-b:a", "32k", "-application", "voip", ogg], { timeoutMs: 40_000 });
        const bytes = fs.readFileSync(ogg);
        if (!bytes.length || bytes.length > MAX_OUTPUT_BYTES) throw new Error("VOICE_OUTPUT_INVALID");
        return bytes;
    } finally { fs.rmSync(work, { recursive: true, force: true }); }
}

async function removeBackground(buffer, mime, options = {}) {
    if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_BIG");
    const ext = checkImageMedia({ mimetype: mime }, buffer.length);
    const work = fs.mkdtempSync(path.join(options.tmp || os.tmpdir(), "jbot-bg-"));
    const input = path.join(work, "original" + ext);
    const output = path.join(work, "sin-fondo.png");
    try {
        fs.writeFileSync(input, buffer, { mode: 0o600 });
        const tool = options.run || runProcess;
        await tool(options.rembg || rembgPath(),
            ["i", "-m", "u2netp", input, output], { timeoutMs: 180_000 });
        const result = fs.readFileSync(output);
        if (!result.length || result.length > MAX_OUTPUT_BYTES ||
            !result.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
            throw new Error("IMAGE_OUTPUT_INVALID");
        }
        return result;
    } finally { fs.rmSync(work, { recursive: true, force: true }); }
}

module.exports = {
    MAX_VOICE_BYTES, MAX_IMAGE_BYTES, MAX_AUDIO_SECONDS,
    enabled, isBackgroundRequest, voiceNote, fileSize,
    checkVoiceMedia, checkImageMedia, getImageQuotedOrDirect,
    createBusyGate, runProcess, transcribeVoice, speakSpanish, removeBackground,
};
