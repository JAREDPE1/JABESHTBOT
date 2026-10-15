const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { obtenerRutasPdf } = require("../lib/pdf-service");

test("encuentra el PDF generado a partir del nombre temporal del DOCX", () => {
  const word = {fileName:"Resumen_San_Bartolo.docx",filePath:"/tmp/123456_Resumen_San_Bartolo.docx"};
  const out = obtenerRutasPdf(word, "/tmp/salida");
  assert.equal(out.nombrePdf, "Resumen_San_Bartolo.pdf");
  assert.equal(out.archivoPdf, path.join("/tmp/salida", "123456_Resumen_San_Bartolo.pdf"));
});
