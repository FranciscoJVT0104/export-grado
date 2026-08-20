// Node test to load script.js in a mocked DOM environment and test all processing functions

const fs = require('fs');

global.document = {
    getElementById: (id) => ({
        addEventListener: () => {},
        style: {},
        value: "",
        textContent: "",
        classList: { add: () => {}, remove: () => {} }
    })
};

global.window = {
    addEventListener: () => {}
};

global.FileReader = class {};
global.Blob = class {};
global.URL = { createObjectURL: () => "", revokeObjectURL: () => {} };

const code = fs.readFileSync('script.js', 'utf8');
eval(code);

const sampleScreenshotDoc = `MACHACA TTITO GHANIRA
TEMA: CANNABIS MEDICINAL
9. ¿CUÁL CONJUNTO DE EFECTOS ADVERSOS DEBE VIGILARSE DURANTE EL USO DE CANNABIS MEDICINAL?
a) Somnolencia, mareos, ansiedad, confusión, taquicardia, cambios de ánimo, náuseas o alteración cognitiva.
b) Aumento obligatorio de masa muscular, mejor memoria, mayor energía y reducción permanente del dolor.
c) Curación inmediata de enfermedades crónicas, sin recaídas, interacciones ni necesidad de controles.
d) Eliminación total de insomnio, ansiedad y depresión sin riesgo de dependencia o tolerancia.
E) mejora constante de reflejos, concentración, coordinación y capacidad para conducir
10¿cuál opción sintetiza mejor el rol técnico ante adultos jóvenes que usan cannabis medicinal?.
a) Educar, observar efectos adversos, reforzar uso indicado, desalentar automedicación, registrar y comunicar alarmas.
b) Prescribir cannabis medicinal cuando el paciente refiere dolor, ansiedad o insomnio persistente.
c) Recomendar productos con mayor thc si el paciente busca alivio rápido de síntomas emocionales.
d) Suspender medicamentos indicados si el paciente considera que el cannabis le ayuda más.
e) Minimizar riesgos porque el cannabis medicinal es natural y no requiere vigilancia clínica.

LLAMO GABRIEL YUDIT
PUERTAS ROJAS GLORIA EDITH
TEMA: SINDROME DE FATIGA CRONICA, ABORDAJE Y CUIDADOS DEL TECNICO DE ENFERMERIA EN LA ATENCION PRIMARIA
1. ¿CUÁL ENUNCIADO DESCRIBE MEJOR EL SÍNDROME DE FATIGA CRÓNICA DESDE EL ENFOQUE DE ATENCIÓN PRIMARIA?
a) Condición compleja con fatiga persistente, no explicada por esfuerzo habitual y que limita la actividad diaria.
b) Cansancio pasajero por falta de sueño, que mejora siempre con descanso breve y alimentación adecuada.
c) Infección viral aguda de resolución rápida que requiere reposo laboral de solo cuarenta y ocho horas.
d) Cuadro psiquiátrico primario que contraindica cualquier tipo de evaluación física o metabólica.
e) Alteración muscular benigna que cede con ejercicios intensos de alto impacto desde el primer día.`;

console.log("=== PRUEBA DE CASO DE LA CAPTURA DIRECTO CON SCRIPT.JS ===");
const grupos = extraerGruposDesdeTexto(sampleScreenshotDoc);
console.log("Grupos extraídos:", grupos.length);
grupos.forEach(g => {
    console.log(`\nAlumno: ${g.alumno.nombre} (Total Preguntas: ${g.preguntas.length})`);
    g.preguntas.forEach((p, i) => {
        console.log(`  Pregunta ${i+1}: "${p.texto}" (${p.opciones.length} alts)`);
    });
});

const analisis = analizarEstructuraPreguntas(grupos);
console.log("\n--- Resultado de Análisis Dashboard ---");
console.log(" Total Alumnos:", analisis.totalAlumnos);
console.log(" Total Preguntas:", analisis.totalPreguntas);
console.log(" Advertencias (≠ 5 alts):", analisis.advertencias.length);
if (analisis.advertencias.length > 0) {
    console.log(" Detalle advertencias:", analisis.advertencias);
}
