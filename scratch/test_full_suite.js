const fs = require('fs');
const assert = require('assert');

// Mock DOM
let renderedHtml = "";
let panelDisplay = "";
let downloadedFiles = {};

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
    createElement: (tag) => {
        const el = {
            href: "",
            download: "",
            click: () => {
                downloadedFiles[el.download] = el._blobContent;
            }
        };
        return el;
    }
};

global.window = {
    addEventListener: () => {}
};

global.FileReader = class {};
global.Blob = class {
    constructor(contentArray) {
        this.content = contentArray.join("");
    }
};
global.URL = {
    createObjectURL: (blob) => {
        return blob.content;
    },
    revokeObjectURL: () => {}
};

const code = fs.readFileSync('script.js', 'utf8');
eval(code);

console.log("=== 1. TEST: DETECTAR ALUMNOS DUPLICADOS EN 2 TIPOS DISTINTOS DE EXAMEN ===");

const docConAlumnoDuplicadoEn2Tipos = `
ALUMNOS: HUAMANI QUISPE CARLOS
TEMA: PEDIATRIA CLINICA
1. ¿Cuál es el rango normal de frecuencia cardíaca en un recién nacido?
a) 60 a 80 lpm.
b) 80 a 100 lpm.
c) 120 a 160 lpm.
d) 180 a 220 lpm.
e) 220 a 250 lpm.
2. ¿Qué vacuna se aplica al nacer?
a) BCG y Hepatitis B.
b) Antitetánica.
c) Triple viral.
d) Influenza.
e) Varicela.

ALUMNOS: PEREZ ZAPATA LUCIA
TEMA: GASTROENTEROLOGIA
1. ¿Cuál es el síntoma principal del reflujo gastroesofágico?
a) Pirosis.
b) Cefalea.
c) Tos seca.
d) Fiebre.
e) Prurito.
2. ¿Dónde se absorbe la vitamina B12?
a) Estómago.
b) Duodeno.
c) Yeyuno.
d) Íleon terminal.
e) Colon.

ALUMNOS: CARLOS HUAMANI QUISPE
TEMA: NEUROLOGIA
1. ¿Cuál es el principal neurotransmisor inhibitorio del SNC?
a) Glutamato.
b) GABA.
c) Dopamina.
d) Serotonina.
e) Acetilcolina.
2. ¿Cuántos pares craneales existen?
a) 10 pares.
b) 12 pares.
c) 14 pares.
d) 8 pares.
e) 16 pares.
`;

const grupos = extraerGruposDesdeTexto(docConAlumnoDuplicadoEn2Tipos);
console.log("Total grupos extraídos:", grupos.length);
assert.strictEqual(grupos.length, 3);
assert.strictEqual(grupos[0].tema, "PEDIATRIA CLINICA");
assert.strictEqual(grupos[1].tema, "GASTROENTEROLOGIA");
assert.strictEqual(grupos[2].tema, "NEUROLOGIA");

const analisis = analizarEstructuraPreguntas(grupos);
console.log("Total Alumnos analizados:", analisis.totalAlumnos);
console.log("Alumnos duplicados encontrados:", analisis.duplicadosAlumnos.length);

assert.strictEqual(analisis.duplicadosAlumnos.length, 1);
const dup = analisis.duplicadosAlumnos[0];
console.log("Detalle alumno duplicado:", {
    nombre: dup.nombre,
    coincidencias: dup.coincidencias,
    tiposDistintos: dup.tiposDistintos,
    cantidadTiposExamen: dup.cantidadTiposExamen,
    grupos: dup.grupos.map(g => ({ numero: g.numero, tema: g.tema, totalPreguntas: g.totalPreguntas }))
});

assert.strictEqual(dup.coincidencias, 2);
assert.strictEqual(dup.tiposDistintos, true);
assert.strictEqual(dup.cantidadTiposExamen, 2);
assert.strictEqual(dup.grupos[0].numero, "01");
assert.strictEqual(dup.grupos[1].numero, "03");

console.log("\n=== 2. TEST: RENDERIZAR DASHBOARD CON ALUMNOS DUPLICADOS ===");
renderizarAnalisisDashboard(analisis);
assert.strictEqual(panelDisplay, "block");
assert.strictEqual(renderedHtml.includes("Alumnos Duplicados"), true);
assert.strictEqual(renderedHtml.includes("duplicate-student-active"), true);
assert.strictEqual(renderedHtml.includes("alumno(s) duplicado(s) en diferentes grupos de examen"), true);
assert.strictEqual(renderedHtml.includes("⚠️ Encontrado en 2 tipos de examen distintos"), true);
assert.strictEqual(renderedHtml.includes("Grupo 01"), true);
assert.strictEqual(renderedHtml.includes("Grupo 03"), true);
console.log("Dashboard renderizado con éxito e incluye las alertas y KPI correspondientes.");

console.log("\n=== 3. TEST: FORMATO DE 'LISTA DE ALUMNOS' CON 01., 02., ... 09., 10. ===");
// Simular click de exportAlumnosBtn
textoOriginal = docConAlumnoDuplicadoEn2Tipos;

// Crear mock de lista con 11 alumnos para verificar 01 hasta 11
const doc11Alumnos = Array.from({ length: 11 }, (_, i) => `
ALUMNOS: ESTUDIANTE NUMERO ${i + 1}
TEMA: TEMA ${i + 1}
1. Pregunta de prueba
a) A.
b) B.
c) C.
d) D.
e) E.
`).join("\n");

const grupos11 = extraerGruposDesdeTexto(doc11Alumnos);
const alumnos11 = grupos11.map(g => g.alumno.nombre);
const textoLista11 = alumnos11
    .map((a, index) => `${String(index + 1).padStart(2, "0")}. ${nombreEnMayusculas(a)}`)
    .join("\n");

console.log("Primeras 3 líneas:\n" + textoLista11.split("\n").slice(0, 3).join("\n"));
console.log("Líneas 9 y 10:\n" + textoLista11.split("\n").slice(8, 10).join("\n"));

assert.strictEqual(textoLista11.split("\n")[0], "01. ESTUDIANTE NUMERO 1");
assert.strictEqual(textoLista11.split("\n")[1], "02. ESTUDIANTE NUMERO 2");
assert.strictEqual(textoLista11.split("\n")[8], "09. ESTUDIANTE NUMERO 9");
assert.strictEqual(textoLista11.split("\n")[9], "10. ESTUDIANTE NUMERO 10");
assert.strictEqual(textoLista11.split("\n")[10], "11. ESTUDIANTE NUMERO 11");

console.log("\n=== 4. TEST: CASO PERFECTO SIN DUPLICADOS ===");
const docPerfecto = `
ALUMNOS: ANA TORRES
1. ¿Pregunta 1?
a) A.
b) B.
c) C.
d) D.
e) E.

ALUMNOS: CARLOS DIAZ
1. ¿Pregunta 1?
a) A.
b) B.
c) C.
d) D.
e) E.
`;
const gruposPerfectos = extraerGruposDesdeTexto(docPerfecto);
const analisisPerfecto = analizarEstructuraPreguntas(gruposPerfectos);
assert.strictEqual(analisisPerfecto.duplicadosAlumnos.length, 0);
renderizarAnalisisDashboard(analisisPerfecto);
assert.strictEqual(renderedHtml.includes("¡Estructura Correcta!"), true);
assert.strictEqual(renderedHtml.includes("Sin duplicados"), true);

console.log("\n¡TODOS LOS TESTS COMPLETADOS SATISFACTORIAMENTE!");
