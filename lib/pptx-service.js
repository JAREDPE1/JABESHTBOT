const fs = require("fs");
const path = require("path");
const PPTXGenJS = require("pptxgenjs");

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

async function crearDocumentoPptx(documentData, tmpDir) {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const fileName = `${crearNombreArchivo(documentData.fileBaseName || documentData.title)}.pptx`;
    const filePath = path.join(tmpDir, `${Date.now()}_${fileName}`);
    const pptx = construirPptx(documentData);
    const buffer = await pptx.write("nodebuffer");
    fs.writeFileSync(filePath, buffer);

    return {
        fileName,
        filePath,
        mimetype: PPTX_MIME,
    };
}

function construirPptx(data) {
    const pptx = new PPTXGenJS();
    pptx.author = "JABESHT - BOT";
    pptx.company = "JABESHT - BOT";
    pptx.layout = "LAYOUT_WIDE";

    crearPortada(pptx, data);
    data.sections.forEach((section, index) => crearSeccion(pptx, section, index));

    if (data.bibliography.length) {
        crearBibliografia(pptx, data.bibliography);
    }

    return pptx;
}

function crearPortada(pptx, data) {
    const fecha = data.generatedAt instanceof Date
        ? data.generatedAt.toLocaleDateString("es-PE")
        : new Date().toLocaleDateString("es-PE");

    const slide = pptx.addSlide();
    slide.background = { color: "EFEFEF" };
    slide.addText("JABESHT - BOT", { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 24, bold: true, align: "center" });
    slide.addText(data.title, { x: 0.5, y: 1.1, w: 9, h: 1.2, fontSize: 32, bold: true, align: "center", color: "363636" });
    if (data.subtitle) {
        slide.addText(data.subtitle, { x: 0.5, y: 2.4, w: 9, h: 0.8, fontSize: 18, align: "center", color: "5A5A5A" });
    }
    slide.addText(`Tema: ${data.topic}`, { x: 0.8, y: 3.3, w: 8.4, h: 0.5, fontSize: 16, color: "4A4A4A" });
    slide.addText(`Tipo: ${capitalizar(data.type)}`, { x: 0.8, y: 3.8, w: 8.4, h: 0.5, fontSize: 16, color: "4A4A4A" });
    slide.addText(`Fecha: ${fecha}`, { x: 0.8, y: 4.3, w: 8.4, h: 0.5, fontSize: 16, color: "4A4A4A" });
}

function crearSeccion(pptx, section, index) {
    const slide = pptx.addSlide();
    slide.addText(`${index + 1}. ${section.heading}`, { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 28, bold: true, color: "363636" });

    const content = [];
    section.paragraphs.forEach(paragraph => {
        if (paragraph) content.push(paragraph);
    });
    section.bullets.forEach(bullet => {
        if (bullet) content.push(`• ${bullet}`);
    });

    slide.addText(content.join("\n\n"), {
        x: 0.5,
        y: 1.1,
        w: 9,
        h: 4.5,
        fontSize: 18,
        color: "333333",
        lineSpacing: 20,
    });
}

function crearBibliografia(pptx, bibliography) {
    const slide = pptx.addSlide();
    slide.addText("Bibliografia APA", { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 28, bold: true, color: "363636" });
    slide.addText(bibliography.map(ref => `• ${ref}`).join("\n\n"), {
        x: 0.5,
        y: 1.1,
        w: 9,
        h: 4.5,
        fontSize: 16,
        color: "333333",
        lineSpacing: 20,
    });
}

function crearNombreArchivo(value) {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "documento";
}

function capitalizar(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = {
    crearDocumentoPptx,
};
