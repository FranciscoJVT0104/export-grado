const fs = require('fs');
const assert = require('assert');

// Mock DOM
let renderedHtml = "";
let panelDisplay = "";

global.document = {
    getElementById: (id) => {
        if (id === "analysisPanel") {
            return {
                style: {
                    get display() { return panelDisplay; },
                    set display(v) { panelDisplay = v; }
                },
                set innerHTML(html) { renderedHtml = html; },
                get innerHTML() { return renderedHtml; }
            };
        }
        return {
            addEventListener: () => {},
            style: {},
            value: "",
            textContent: "",
            classList: { add: () => {}, remove: () => {} },
            click: () => {}
        };
    },
    createElement: () => ({ href: "", download: "", click: () => {} })
};

global.window = {
    addEventListener: () => {}
};
global.FileReader = class {};
global.Blob = class { constructor(arr) { this.content = arr.join(""); } };
global.URL = { createObjectURL: () => "", revokeObjectURL: () => {} };

const code = fs.readFileSync('script.js', 'utf8');
eval(code);

const sampleUserScreenshotDoc = `
ALUMNOS: ALUMNO DE PRUEBA
TEMA: BRUCELOSIS
9. PARA EL TRATAMIENTO DE LA BRUCELOSIS EN GESTANTES (DESPUÉS DEL PRIMER TRIMESTRE) Y MUJERES EN LACTANCIA, ¿QUÉ COMBINACIÓN DE ANTIBIÓTICOS SE EMPLEA, CONSIDERANDO LA CONTRAINDICACIÓN DE LA DOXICICLINA?
a) Rifampicina y cotrimoxazol.
b) Doxiciclina y estreptomicina.
b) Estreptomicina y rifampicina.
c) Doxiciclina y cotrimoxazol.
d) Ceftriaxona y doxiciclina.
`;

console.log("=== 1. PROBAR PROCESAMIENTO TXT (CORRECCIÓN AUTOMÁTICA DE LETRAS) ===");
const textoProcesado = procesarTextoTXT(sampleUserScreenshotDoc);
console.log(textoProcesado);

assert.strictEqual(textoProcesado.includes("a) Rifampicina y cotrimoxazol."), true);
assert.strictEqual(textoProcesado.includes("b) Doxiciclina y estreptomicina."), true);
assert.strictEqual(textoProcesado.includes("c) Estreptomicina y rifampicina."), true);
assert.strictEqual(textoProcesado.includes("d) Doxiciclina y cotrimoxazol."), true);
assert.strictEqual(textoProcesado.includes("e) Ceftriaxona y doxiciclina."), true);
console.log("✔ procesarTextoTXT corrigió exitosamente la secuencia a: a), b), c), d), e)");

console.log("\n=== 2. PROBAR DETECCIÓN DE ERROR EN ANÁLISIS DE ESTRUCTURA ===");
const grupos = extraerGruposDesdeTexto(sampleUserScreenshotDoc);
const analisis = analizarEstructuraPreguntas(grupos);

console.log("Advertencias detectadas:", analisis.advertencias.length);
console.log("Detalle de la advertencia:", analisis.advertencias[0]);

assert.strictEqual(analisis.advertencias.length, 1);
assert.strictEqual(analisis.advertencias[0].numeroPregunta, 1);
assert.strictEqual(analisis.advertencias[0].badge.includes("a, b, b, c, d"), true);
assert.strictEqual(analisis.advertencias[0].detalle.includes('letra(s) repetida(s): "b" (2 veces)'), true);
assert.strictEqual(analisis.advertencias[0].detalle.includes('falta(n): "e"'), true);

console.log("\n=== 3. PROBAR RENDERIZADO EN EL DASHBOARD ===");
renderizarAnalisisDashboard(analisis);
console.log("Contiene aviso de inconsistencia:", renderedHtml.includes("inconsistencia en alternativas"));
console.log("Contiene letras detectadas:", renderedHtml.includes("a, b, b, c, d"));
console.log("Contiene mensaje de auto-corrección:", renderedHtml.includes("reordenaron automáticamente"));

assert.strictEqual(renderedHtml.includes("inconsistencia en alternativas"), true);
assert.strictEqual(renderedHtml.includes("a, b, b, c, d"), true);
assert.strictEqual(renderedHtml.includes("reordenaron automáticamente"), true);

console.log("\n¡TODAS LAS PRUEBAS DEL CASO DEL USUARIO PASARON EXITOSAMENTE!");
