"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const MIME_PDF = "application/pdf";

// Convierte el DOCX que ya genera JABESHTBOT a PDF con LibreOffice.
// Linux Mint normalmente tiene LibreOffice; en un VPS se instala aparte.
async function crearPdfDesdeWord(word, tmpDir) {
    fs.mkdirSync(tmpDir, { recursive: true });
    const temporal = fs.mkdtempSync(path.join(tmpDir, "pdf-"));
    const salida = path.join(temporal, "salida");
    const perfil = path.join(temporal, "perfil");
    fs.mkdirSync(salida, { recursive: true });
    const nombrePdf = path.basename(word.fileName, path.extname(word.fileName)) + ".pdf";
    const archivoPdf = path.join(salida, nombrePdf);
    try {
        await new Promise((resolve, reject) => {
            const comando = process.env.LIBREOFFICE_PATH || "libreoffice";
            const proceso = spawn(comando, [
                "-env:UserInstallation=" + pathToFileURL(perfil).href,
                "--headless", "--convert-to", "pdf:writer_pdf_Export",
                "--outdir", salida, word.filePath
            ], { shell: false, windowsHide: true });
            let error = "";
            let terminado = false;
            const reloj = setTimeout(() => {
                if (terminado) return;
                proceso.kill();
            }, 120000);
            function finalizar(fallo) {
                if (terminado) return;
                terminado = true;
                clearTimeout(reloj);
                if (fallo) reject(fallo);
                else resolve();
            }
            proceso.stderr.on("data", fragmento => {
                error += fragmento.toString().slice(0, 1000);
            });
            proceso.on("error", err => finalizar(err));
            proceso.on("close", codigo => {
                if (codigo !== 0) return finalizar(new Error("Error LibreOffice: " + (error || codigo)));
                finalizar();
            });
        });
        if (!fs.existsSync(archivoPdf) || fs.statSync(archivoPdf).size === 0) {
            throw new Error("No se genero el PDF");
        }
        return { filePath: archivoPdf, fileName: nombrePdf, mimetype: MIME_PDF, cleanupDir: temporal };
    } catch (err) {
        fs.rmSync(temporal, { recursive: true, force: true });
        throw err;
    }
}

module.exports = { crearPdfDesdeWord };
