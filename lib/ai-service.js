const axios = require("axios");

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_TIMEOUT_MS = 90_000;

const DOCUMENT_TYPES = {
    monografia: {
        label: "monografia",
        titlePrefix: "Monografia",
        sections: ["Introduccion", "Objetivos", "Desarrollo", "Conclusiones"],
        instructions: "Genera una monografia academica completa, organizada, seria y con lenguaje claro.",
        minParagraphs: 10,
        maxTokens: 4200,
    },
    ensayo: {
        label: "ensayo",
        titlePrefix: "Ensayo",
        sections: ["Introduccion", "Tesis", "Argumentos", "Reflexion critica", "Conclusiones"],
        instructions: "Genera un ensayo completo con postura clara, argumentos desarrollados y cierre reflexivo.",
        minParagraphs: 8,
        maxTokens: 3400,
    },
    resumen: {
        label: "resumen",
        titlePrefix: "Resumen",
        sections: ["Resumen general", "Ideas principales", "Conceptos clave", "Importancia del tema"],
        instructions: "Genera un resumen estructurado, sintetico y util para estudiar.",
        minParagraphs: 5,
        maxTokens: 2600,
    },
    exposicion: {
        label: "exposicion",
        titlePrefix: "Exposicion",
        sections: ["Presentacion", "Puntos principales", "Guion para exponer", "Preguntas posibles", "Cierre"],
        instructions: "Genera material listo para una exposicion oral, con guion claro y puntos faciles de explicar.",
        minParagraphs: 7,
        maxTokens: 3400,
    },
    introduccion: {
        label: "introduccion",
        titlePrefix: "Introduccion",
        sections: ["Introduccion"],
        instructions: "Genera unicamente una introduccion academica completa sobre el tema.",
        minParagraphs: 3,
        maxTokens: 1600,
    },
    conclusion: {
        label: "conclusion",
        titlePrefix: "Conclusion",
        sections: ["Conclusion"],
        instructions: "Genera unicamente una conclusion academica completa sobre el tema.",
        minParagraphs: 3,
        maxTokens: 1600,
    },
    objetivos: {
        label: "objetivos",
        titlePrefix: "Objetivos",
        sections: ["Objetivo general", "Objetivos especificos"],
        instructions: "Genera objetivos academicos: un objetivo general y varios objetivos especificos medibles.",
        minParagraphs: 4,
        maxTokens: 1600,
    },
};

function getDocumentType(type) {
    return DOCUMENT_TYPES[type] || null;
}

function getAiProvider() {
    return (process.env.AI_PROVIDER || "openai").toLowerCase().trim();
}

function hasAiConfig() {
    if (getAiProvider() === "gemini") return Boolean(process.env.GEMINI_API_KEY);
    return Boolean(process.env.OPENAI_API_KEY);
}

function getOpenAiModel() {
    return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

function getGeminiModel() {
    return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function responderPreguntaIa(pregunta) {
    const input = pregunta.trim();
    if (!input) throw new Error("IA_EMPTY_INPUT");

    return callAiText({
        instructions: [
            "Eres un asistente educativo para un bot de WhatsApp.",
            "Responde en espanol, con claridad, sin inventar datos y de forma util para estudiantes.",
            "Si el tema requiere matices, explica con orden y ejemplos breves.",
        ].join("\n"),
        input,
        maxOutputTokens: Number(process.env.IA_MAX_TOKENS || process.env.OPENAI_IA_MAX_TOKENS || 1200),
    });
}

async function generarDocumentoAcademico(type, topic) {
    const config = getDocumentType(type);
    if (!config) throw new Error("IA_UNKNOWN_DOCUMENT_TYPE");

    const tema = topic.trim();
    if (!tema) throw new Error("IA_EMPTY_INPUT");

    const rawText = await callAiText({
        instructions: crearInstruccionesDocumento(config),
        input: `Tema: ${tema}`,
        maxOutputTokens: Number(process.env.DOC_MAX_TOKENS || process.env.OPENAI_DOC_MAX_TOKENS || config.maxTokens),
    });

    const document = parseJsonDocument(rawText);
    return normalizarDocumentoAcademico(document, config, tema);
}

async function callAiText({ instructions, input, maxOutputTokens }) {
    if (getAiProvider() === "gemini") {
        return callGeminiText({ instructions, input, maxOutputTokens });
    }
    return callOpenAiText({ instructions, input, maxOutputTokens });
}

async function callOpenAiText({ instructions, input, maxOutputTokens }) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");

    const response = await axios.post(
        OPENAI_RESPONSES_URL,
        {
            model: getOpenAiModel(),
            instructions,
            input,
            max_output_tokens: maxOutputTokens,
        },
        {
            timeout: Number(process.env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
        }
    );

    const text = extractResponseText(response.data);
    if (!text) throw new Error("OPENAI_EMPTY_RESPONSE");
    return text.trim();
}

async function callGeminiText({ instructions, input, maxOutputTokens }) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY_MISSING");

    const model = getGeminiModel();
    const url = GEMINI_GENERATE_URL.replace("{model}", encodeURIComponent(model));
    const response = await axios.post(
        `${url}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
        {
            systemInstruction: {
                parts: [{ text: instructions }],
            },
            contents: [
                {
                    role: "user",
                    parts: [{ text: input }],
                },
            ],
            generationConfig: {
                maxOutputTokens,
                temperature: 0.7,
            },
        },
        {
            timeout: Number(process.env.GEMINI_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    const text = extractGeminiText(response.data);
    if (!text) throw new Error("GEMINI_EMPTY_RESPONSE");
    return text.trim();
}

function crearInstruccionesDocumento(config) {
    return [
        "Eres un redactor academico experto.",
        "Escribe en espanol neutro, con tono formal, claro y original.",
        "No menciones que eres una IA.",
        "Evita enlaces inventados. La bibliografia debe tener formato APA y usar referencias generales plausibles.",
        config.instructions,
        `El trabajo debe tener al menos ${config.minParagraphs} parrafos utiles entre sus secciones.`,
        "Devuelve unica y exclusivamente JSON valido, sin Markdown, sin ``` y sin texto adicional.",
        "Estructura exacta:",
        JSON.stringify({
            title: "Titulo academico del trabajo",
            subtitle: "Subtitulo breve opcional",
            sections: config.sections.map((heading) => ({
                heading,
                paragraphs: ["Parrafo desarrollado 1", "Parrafo desarrollado 2"],
                bullets: ["Punto opcional"],
            })),
            bibliography: [
                "Apellido, A. A. (2024). Titulo de referencia. Editorial o institucion.",
            ],
        }, null, 2),
    ].join("\n");
}

function extractResponseText(data) {
    if (typeof data?.output_text === "string") return data.output_text;

    const parts = [];
    for (const item of data?.output || []) {
        for (const content of item?.content || []) {
            if (typeof content?.text === "string") parts.push(content.text);
        }
    }
    return parts.join("\n").trim();
}

function extractGeminiText(data) {
    const parts = [];
    for (const candidate of data?.candidates || []) {
        for (const part of candidate?.content?.parts || []) {
            if (typeof part?.text === "string") parts.push(part.text);
        }
    }
    return parts.join("\n").trim();
}

function parseJsonDocument(text) {
    const clean = text.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    try {
        return JSON.parse(clean);
    } catch {
        const start = clean.indexOf("{");
        const end = clean.lastIndexOf("}");
        if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
        throw new Error("OPENAI_INVALID_JSON");
    }
}

function normalizarDocumentoAcademico(document, config, topic) {
    const title = limpiarTexto(document.title) || `${config.titlePrefix}: ${topic}`;
    const subtitle = limpiarTexto(document.subtitle) || "";
    const sections = Array.isArray(document.sections) ? document.sections : [];

    return {
        type: config.label,
        title,
        subtitle,
        topic,
        fileBaseName: `${config.titlePrefix}_${topic}`,
        sections: sections.map((section, index) => ({
            heading: limpiarTexto(section.heading) || config.sections[index] || `Seccion ${index + 1}`,
            paragraphs: normalizarLista(section.paragraphs),
            bullets: normalizarLista(section.bullets),
        })).filter(section => section.paragraphs.length || section.bullets.length),
        bibliography: normalizarLista(document.bibliography),
        generatedAt: new Date(),
    };
}

function normalizarLista(value) {
    if (!Array.isArray(value)) return [];
    return value.map(limpiarTexto).filter(Boolean);
}

function limpiarTexto(value) {
    if (value === undefined || value === null) return "";
    return String(value).replace(/\s+/g, " ").trim();
}

module.exports = {
    getDocumentType,
    hasAiConfig,
    responderPreguntaIa,
    generarDocumentoAcademico,
};
