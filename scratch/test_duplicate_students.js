const assert = require('assert');

function normalizarTextoComparacion(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[¿?¡!.,;:\-_]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizarNombreParaComparar(nombre) {
    if (!nombre) return "";
    const limpio = normalizarTextoComparacion(nombre);
    const palabras = limpio.split(/\s+/).filter(Boolean);
    return palabras.sort().join(" ");
}

function nombreEnMayusculas(nombre) {
    return String(nombre || "").trim().toUpperCase();
}

function detectarAlumnosDuplicados(grupos) {
    if (!Array.isArray(grupos) || grupos.length === 0) return [];

    const mapaAlumnos = new Map();

    grupos.forEach((grupo, idx) => {
        const alumnoObj = grupo.alumno || {};
        const nombreOriginal = (alumnoObj.nombre || "").trim();
        if (!nombreOriginal) return;

        const claveNorm = normalizarNombreParaComparar(nombreOriginal);
        if (!claveNorm) return;

        const huellaPreguntas = (grupo.preguntas || [])
            .map(p => normalizarTextoComparacion(p.texto))
            .join("|");

        const previewPregunta = (grupo.preguntas && grupo.preguntas.length > 0 && grupo.preguntas[0].texto)
            ? (grupo.preguntas[0].texto.length > 60
                ? grupo.preguntas[0].texto.substring(0, 60) + "..."
                : grupo.preguntas[0].texto)
            : "";

        const detalle = {
            indice: idx + 1,
            numero: alumnoObj.numero || String(idx + 1).padStart(2, "0"),
            tema: (grupo.tema || "").trim(),
            totalPreguntas: (grupo.preguntas || []).length,
            huella: huellaPreguntas,
            preview: previewPregunta
        };

        if (!mapaAlumnos.has(claveNorm)) {
            mapaAlumnos.set(claveNorm, {
                nombre: nombreEnMayusculas(nombreOriginal),
                apariciones: []
            });
        }

        mapaAlumnos.get(claveNorm).apariciones.push(detalle);
    });

    const duplicados = [];

    mapaAlumnos.forEach((data) => {
        if (data.apariciones.length > 1) {
            const huellasUnicas = new Set(data.apariciones.map(a => a.huella));
            const tiposDistintos = huellasUnicas.size > 1;

            duplicados.push({
                nombre: data.nombre,
                coincidencias: data.apariciones.length,
                tiposDistintos: tiposDistintos,
                cantidadTiposExamen: huellasUnicas.size,
                grupos: data.apariciones
            });
        }
    });

    return duplicados;
}

const gruposPrueba = [
    {
        alumno: { numero: "01", nombre: "JUAN PÉREZ" },
        tema: "FARMACOLOGÍA",
        preguntas: [
            { texto: "¿Cuál es el fármaco de elección para la hipertensión?", opciones: ["a", "b", "c", "d", "e"] }
        ]
    },
    {
        alumno: { numero: "02", nombre: "MARÍA GÓMEZ" },
        tema: "ANATOMÍA",
        preguntas: [
            { texto: "¿Dónde se ubica el fémur?", opciones: ["a", "b", "c", "d", "e"] }
        ]
    },
    {
        alumno: { numero: "03", nombre: "Perez Juan" },
        tema: "CIRUGÍA",
        preguntas: [
            { texto: "¿Qué tipo de sutura se usa en piel?", opciones: ["a", "b", "c", "d", "e"] }
        ]
    }
];

const dups = detectarAlumnosDuplicados(gruposPrueba);
console.log("Resultado de prueba:", JSON.stringify(dups, null, 2));

assert.strictEqual(dups.length, 1);
assert.strictEqual(dups[0].coincidencias, 2);
assert.strictEqual(dups[0].tiposDistintos, true);
assert.strictEqual(dups[0].grupos[0].numero, "01");
assert.strictEqual(dups[0].grupos[1].numero, "03");

const alumnosLista = ["Juan Perez", "Maria Gomez", "Ana Torres", "Carlos Diaz", "Lucia Vega", "Pedro Ramos", "Sofia Castro", "Luis Quispe", "Elena Flores", "Raul Ortiz"];
const listaTxt = alumnosLista.map((a, i) => `${String(i + 1).padStart(2, "0")}. ${nombreEnMayusculas(a)}`).join("\n");
console.log("\nLista de Alumnos exportada:\n" + listaTxt);

assert.strictEqual(listaTxt.startsWith("01. JUAN PEREZ"), true);
assert.strictEqual(listaTxt.includes("09. ELENA FLORES"), true);
assert.strictEqual(listaTxt.includes("10. RAUL ORTIZ"), true);

console.log("\n¡Todas las pruebas pasaron satisfactoriamente!");
