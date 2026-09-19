const fs = require('fs');
const assert = require('assert');

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
    createElement: () => ({ click: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
};

global.window = { addEventListener: () => {} };
global.FileReader = class {};
global.Blob = class {};
global.URL = { createObjectURL: () => "", revokeObjectURL: () => {} };

const code = fs.readFileSync('script.js', 'utf8');
eval(code);

const docConTemaPartidoYAlternativasFueraFormato = `
ALUMNO:
TARRILLO MEJIA ELIZABETH
TEMA:
CUIDADOS DEL PERSONAL DE ENFERMERÍA EN BEBÉS CON ANIRIDIA
1. ¿Qué medida ambiental básica debe implementar la enfermera en la unidad neonatal para proteger los ojos de un bebé con aniridia?
f) Mantener una iluminación ambiental suave y evitar la exposición directa a luces fluorescentes fuertes o fototerapia sin protección.
g) Apagar por completo todas las luces de la incubadora dejándolas en total oscuridad permanente.
h) Utilizar lámparas de exploración halógenas de alta intensidad enfocadas directamente en el rostro del infante.
i) Retirar todas las persianas de la habitación para permitir el máximo ingreso de luz solar directa.
j) Colocar al bebé cerca de la ventana principal del área de hospitalización.
2. ¿Cuál es la prioridad de cuidado?
a) Proteger del exceso de luz.
b) Estimular exposición solar.
c) Suspender controles.
d) Usar luz intensa.
e) Omitir educación familiar.
`;

console.log("=== CASO SOLICITADO: TEMA PARTIDO Y ALTERNATIVAS F-J ===");

const salidaTxt = procesarTextoTXT(docConTemaPartidoYAlternativasFueraFormato);
assert.ok(salidaTxt.includes("TEMA: CUIDADOS DEL PERSONAL DE ENFERMERÍA EN BEBÉS CON ANIRIDIA"));
assert.ok(salidaTxt.includes("f) Mantener una iluminación ambiental suave"));
assert.ok(salidaTxt.includes("j) Colocar al bebé cerca de la ventana principal"));
assert.ok(!salidaTxt.includes("a) Mantener una iluminación ambiental suave"));

const grupos = extraerGruposDesdeTexto(docConTemaPartidoYAlternativasFueraFormato);
assert.strictEqual(grupos.length, 1);
assert.strictEqual(grupos[0].tema, "CUIDADOS DEL PERSONAL DE ENFERMERÍA EN BEBÉS CON ANIRIDIA");
assert.strictEqual(grupos[0].preguntas.length, 2);
assert.deepStrictEqual(grupos[0].preguntas[0].letrasOriginales, ["F", "G", "H", "I", "J"]);
assert.strictEqual(grupos[0].preguntas[0].texto.includes("MANTENER UNA ILUMINACIÓN"), false);

const analisis = analizarEstructuraPreguntas(grupos);
assert.strictEqual(analisis.advertencias.length, 1);
assert.strictEqual(analisis.advertencias[0].autoCorregido, false);
assert.ok(analisis.advertencias[0].badge.includes("Fuera a-e"));
assert.ok(analisis.advertencias[0].detalle.includes("Se conservaron las letras originales"));

renderizarAnalisisDashboard(analisis);
assert.strictEqual(panelDisplay, "block");
assert.ok(renderedHtml.includes("Fuera a-e"));
assert.ok(renderedHtml.includes("Se conservaron las letras originales"));
assert.strictEqual(renderedHtml.includes("se reordenaron automáticamente"), false);

console.log("Prueba completada correctamente.");
