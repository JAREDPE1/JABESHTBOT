const fs = require("fs");
const path = require("path");
const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    PageBreak,
    Paragraph,
    TextRun,
} = require("docx");

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function crearDocumentoWord(documentData, tmpDir) {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const fileName = `${crearNombreArchivo(documentData.fileBaseName || documentData.title)}.docx`;
    const filePath = path.join(tmpDir, `${Date.now()}_${fileName}`);
    const doc = construirDocx(documentData);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    return {
        fileName,
        filePath,
        mimetype: DOCX_MIME,
    };
}

function construirDocx(data) {
    const children = [
        ...crearPortada(data),
        new Paragraph({ children: [new PageBreak()] }),
        crearTitulo("Indice", HeadingLevel.HEADING_1),
        ...crearIndice(data),
        new Paragraph({ children: [new PageBreak()] }),
    ];

    data.sections.forEach((section, index) => {
        children.push(crearTitulo(`${index + 1}. ${section.heading}`, HeadingLevel.HEADING_1));
        section.paragraphs.forEach(paragraph => {
            children.push(crearParrafo(paragraph));
        });
        section.bullets.forEach(bullet => {
            children.push(crearBullet(bullet));
        });
    });

    if (data.bibliography.length) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
        children.push(crearTitulo("Bibliografia APA", HeadingLevel.HEADING_1));
        data.bibliography.forEach(reference => {
            children.push(crearParrafo(reference));
        });
    }

    return new Document({
        creator: "JABESHT - BOT",
        title: data.title,
        description: `Documento generado automaticamente sobre ${data.topic}`,
        styles: {
            default: {
                document: {
                    run: {
                        font: "Calibri",
                        size: 24,
                    },
                    paragraph: {
                        spacing: { line: 360, after: 160 },
                    },
                },
            },
            paragraphStyles: [
                {
                    id: "Title",
                    name: "Title",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 38, bold: true, font: "Calibri" },
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 240 } },
                },
                {
                    id: "Heading1",
                    name: "Heading 1",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 30, bold: true, font: "Calibri" },
                    paragraph: { spacing: { before: 260, after: 180 } },
                },
            ],
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                children,
            },
        ],
    });
}

function crearPortada(data) {
    const fecha = data.generatedAt instanceof Date
        ? data.generatedAt.toLocaleDateString("es-PE")
        : new Date().toLocaleDateString("es-PE");

    return [
        new Paragraph({ text: "JABESHT - BOT", alignment: AlignmentType.CENTER, spacing: { after: 700 } }),
        new Paragraph({
            text: data.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 260 },
        }),
        data.subtitle ? new Paragraph({
            text: data.subtitle,
            alignment: AlignmentType.CENTER,
            spacing: { after: 700 },
        }) : new Paragraph({ text: "", spacing: { after: 700 } }),
        new Paragraph({ text: `Tema: ${data.topic}`, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: `Tipo de trabajo: ${capitalizar(data.type)}`, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: `Fecha: ${fecha}`, alignment: AlignmentType.CENTER, spacing: { before: 700 } }),
    ];
}

function crearIndice(data) {
    const lines = [];
    data.sections.forEach((section, index) => {
        lines.push(new Paragraph({
            children: [
                new TextRun({ text: `${index + 1}. ${section.heading}`, bold: true }),
            ],
        }));
    });
    if (data.bibliography.length) {
        lines.push(new Paragraph({
            children: [
                new TextRun({ text: "Bibliografia APA", bold: true }),
            ],
        }));
    }
    return lines;
}

function crearTitulo(text, heading) {
    return new Paragraph({
        text,
        heading,
    });
}

function crearParrafo(text) {
    return new Paragraph({
        children: [new TextRun(text)],
        alignment: AlignmentType.JUSTIFIED,
    });
}

function crearBullet(text) {
    return new Paragraph({
        text,
        bullet: { level: 0 },
    });
}

function documentoATexto(data) {
    const lines = [
        `*${data.title}*`,
        data.subtitle ? `_${data.subtitle}_` : "",
        "",
    ].filter(Boolean);

    data.sections.forEach((section, index) => {
        lines.push(`*${index + 1}. ${section.heading}*`);
        section.paragraphs.forEach(paragraph => lines.push(paragraph));
        section.bullets.forEach(bullet => lines.push(`- ${bullet}`));
        lines.push("");
    });

    if (data.bibliography.length) {
        lines.push("*Bibliografia APA*");
        data.bibliography.forEach(reference => lines.push(`- ${reference}`));
    }

    return lines.join("\n").trim();
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
    DOCX_MIME,
    crearDocumentoWord,
    documentoATexto,
};
