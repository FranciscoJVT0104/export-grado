// Test file for incomplete exam / question count audit feature

function analizarEstructuraPreguntasMejorado(grupos) {
    if (!grupos || !grupos.length) return null;

    let totalAlumnos = grupos.length;
    let totalPreguntas = 0;
    let advertenciasMapa = new Map();

    // Determinar cantidad estándar de preguntas por examen (la moda)
    const conteos = grupos.map(g => (g.preguntas ? g.preguntas.length : 0));
    const frecuencias = new Map();
    let maxFreq = 0;
    let preguntasEstandar = 10;

    conteos.forEach(c => {
        const f = (frecuencias.get(c) || 0) + 1;
        frecuencias.set(c, f);
        if (f > maxFreq && c > 0) {
            maxFreq = f;
            preguntasEstandar = c;
        }
    });

    const alumnosIncompletos = [];

    grupos.forEach(grupo => {
        const alumnoNombre = grupo.alumno ? (grupo.alumno.nombre || "Desconocido") : "Desconocido";
        const preguntas = grupo.preguntas || [];
        
        if (preguntas.length !== preguntasEstandar) {
            alumnosIncompletos.push({
                alumno: alumnoNombre,
                cantidad: preguntas.length,
                esperadas: preguntasEstandar
            });
        }

        preguntas.forEach((pregunta, idx) => {
            totalPreguntas++;
            const numAlternativas = pregunta.opciones ? pregunta.opciones.length : 0;
            if (numAlternativas !== 5) {
                const numeroPregunta = idx + 1;
                const textoPregunta = pregunta.texto || "Sin enunciado";
                const key = `${numeroPregunta}_${textoPregunta.trim().toUpperCase().replace(/\s+/g, " ")}`;

                if (advertenciasMapa.has(key)) {
                    const advExistente = advertenciasMapa.get(key);
                    if (!advExistente.alumnos.includes(alumnoNombre)) {
                        advExistente.alumnos.push(alumnoNombre);
                    }
                } else {
                    advertenciasMapa.set(key, {
                        alumnos: [alumnoNombre],
                        numeroPregunta: numeroPregunta,
                        textoPregunta: textoPregunta,
                        cantidadAlternativas: numAlternativas
                    });
                }
            }
        });
    });

    const advertencias = Array.from(advertenciasMapa.values()).map(adv => ({
        alumno: adv.alumnos.join(" / "),
        numeroPregunta: adv.numeroPregunta,
        textoPregunta: adv.textoPregunta,
        cantidadAlternativas: adv.cantidadAlternativas
    }));

    return {
        totalAlumnos,
        totalPreguntas,
        preguntasEstandar,
        alumnosIncompletos,
        advertencias
    };
}

// Simulamos 22 alumnos con 10 preguntas y 1 alumno con 9 preguntas (total = 229)
const mockGrupos = [];
for (let i = 1; i <= 22; i++) {
    mockGrupos.push({
        alumno: { numero: String(i).padStart(2, "0"), nombre: `ALUMNO ${i}` },
        preguntas: Array(10).fill({ texto: "PREGUNTA MOCK", opciones: ["a","b","c","d","e"] })
    });
}
mockGrupos.push({
    alumno: { numero: "23", nombre: "ALUMNO 23 (INCOMPLETO)" },
    preguntas: Array(9).fill({ texto: "PREGUNTA MOCK", opciones: ["a","b","c","d","e"] })
});

console.log("=== PRUEBA DE AUDITORÍA DE INCONSISTENCIA EN CANTIDAD DE PREGUNTAS ===");
const res = analizarEstructuraPreguntasMejorado(mockGrupos);
console.log("Total Alumnos:", res.totalAlumnos);
console.log("Total Preguntas:", res.totalPreguntas);
console.log("Preguntas Estándar por Examen:", res.preguntasEstandar);
console.log("Alumnos con cantidad de preguntas atípica:", res.alumnosIncompletos);
