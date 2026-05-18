const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");
const exportBtn = document.getElementById("exportBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const clearBtn = document.getElementById("clearBtn");
const exportAlumnosBtn = document.getElementById("exportAlumnosBtn");
const exportStudentTxtBtn = document.getElementById("exportStudentTxtBtn");

/* ===============================
   VARIABLES
================================ */
let textoOriginal = "";
let textoProcesadoTXT = "";
let datosExcelCargado = null;

/* ===============================
   NORMALIZAR TEXTO
================================ */
function normalizarLineas(texto) {
    return texto
        .split("\n")
        .map(l =>
            l
                .replace(/\t/g, " ")
                .replace(/^•\s*/g, "")
                .replace(/\s+/g, " ")
                .trim()
        )
        .filter(l => l !== "");
}

/* ===============================
   DETECTORES
================================ */
const esOpcion = linea => /^[a-eA-E]\s*[\.\)](\s|$)/.test(linea);

const getLetraOpcion = linea => {
    const match = linea.match(/^([a-eA-E])\s*[\.\)]/);
    return match ? match[1].toUpperCase() : null;
};

const getSeparadorOpcion = linea => {
    const match = linea.match(/^[a-eA-E]\s*([\.\)])/);
    return match ? match[1] : null;
};

const esAlternativa = linea => /^[a-eA-E]\s*[\.\)](\s|$)/.test(linea);

function normalizarAlternativa(linea) {
    const match = String(linea || "").trim().match(/^([a-eA-E])\s*[\.\)]\s*(.*)$/);
    if (!match) return String(linea || "").trim();

    const letra = match[1].toLowerCase();
    let texto = match[2].trim();

    if (texto) {
        // Formato tipo oración: Primera en mayúscula, resto en minúscula
        texto = texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
        // Asegurar que termine en punto
        if (!texto.endsWith(".")) texto += ".";
    }

    return `${letra}) ${texto}`.trim();
}

const limpiarNumeroPregunta = linea =>
    linea
        .replace(/^\d+[\).:-]?\s*/, "")
        .trim();

const esPregunta = (linea) => {
    return /^\d+\./.test(linea);
};

const RE_ENCABEZADO_ALUMNOS = /^(ALUMNOS\s*\(AS\)|ALUMNOS?\s*\(A\)|ALUMNOS\s+\(AS\)|APELLIDOS\s+Y\s+NOMBRES|ALUMNOS|ALUMNA|ALUMNO)\s*[:\-\s]*/i;

const esEncabezadoAlumnos = linea => RE_ENCABEZADO_ALUMNOS.test(linea);

function nombreEnMayusculas(nombre) {
    return String(nombre || "").trim().toUpperCase();
}

function normalizarPregunta(texto) {
    let t = String(texto || "").trim();

    const tieneInicio = t.includes("¿");
    const tieneFin = t.includes("?");

    if (tieneInicio && tieneFin) {
        // Balanceado: eliminar espacios innecesarios tras ¿ y antes de ?
        t = t.replace(/¿\s+/g, "¿").replace(/\s+\?/g, "?");
    } else {
        // Desbalanceado: eliminar signos y limpiar espacios sobrantes
        t = t.replace(/[¿?]/g, "").trim();
    }

    return t.toUpperCase();
}

/* ===============================
   LECTURA ARCHIVOS
================================ */
fileInput.addEventListener("click", function () {
    this.value = "";
});

fileInput.addEventListener("change", function () {
    if (this.files[0]) {
        procesarArchivo(this.files[0]);
    }
});

function leerWord(file) {
    const reader = new FileReader();
    reader.onload = e => {
        mammoth.extractRawText({ arrayBuffer: e.target.result })
            .then(r => {
                textoOriginal = r.value;
                datosExcelCargado = null;
                textoProcesadoTXT = procesarTextoTXT(textoOriginal);
                output.value = textoProcesadoTXT;
                ejecutarAnalisis();
            })
            .catch(err => {
                alert("Error al leer el archivo Word: " + err.message);
                restablecerDropZone();
            });
    };
    reader.onerror = () => {
        alert("Error al leer el archivo.");
        restablecerDropZone();
    };
    reader.readAsArrayBuffer(file);
}

function leerTXT(file) {
    const reader = new FileReader();
    reader.onload = e => {
        textoOriginal = e.target.result;
        datosExcelCargado = null;
        textoProcesadoTXT = procesarTextoTXT(textoOriginal);
        output.value = textoProcesadoTXT;
        ejecutarAnalisis();
    };
    reader.onerror = () => {
        alert("Error al leer el archivo.");
        restablecerDropZone();
    };
    reader.readAsText(file, "UTF-8");
}


function leerExcel(file) {
    const reader = new FileReader();

    reader.onload = e => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const hoja = workbook.Sheets[workbook.SheetNames[0]];
            const filas = XLSX.utils.sheet_to_json(hoja, {
                header: 1,
                defval: "",
                blankrows: false
            });

            const parseado = parsearExcelExamen(filas);

            if (!parseado.grupos.length || !parseado.grupos.some(g => g.preguntas.length)) {
                alert("El Excel no tiene el formato esperado.");
                restablecerDropZone();
                return;
            }

            datosExcelCargado = parseado;
            textoOriginal = "";
            textoProcesadoTXT = "";
            output.value = renderVistaExcel(parseado);
            ejecutarAnalisis();
        } catch (err) {
            alert("Error al procesar el Excel: " + err.message);
            restablecerDropZone();
        }
    };
    reader.onerror = () => {
        alert("Error al leer el archivo.");
        restablecerDropZone();
    };

    reader.readAsArrayBuffer(file);
}

function parsearExcelExamen(filas) {
    const grupos = [];

    let grupoActual = null;
    let preguntaActual = null;

    filas.forEach(row => {
        const celda = String(row[0] ?? "").trim();
        if (!celda) return;

        if (celda.startsWith("$CATEGORY:")) {
            const m = celda.match(/\/(\d+)\.\s*(.+)$/);
            const numero = m ? m[1] : String(grupos.length + 1).padStart(2, "0");
            const nombre = nombreEnMayusculas(m ? m[2].trim() : `ALUMNO_${numero}`);

            grupoActual = {
                alumno: { numero, nombre },
                preguntas: []
            };
            grupos.push(grupoActual);
            preguntaActual = null;
            return;
        }

        const qm = celda.match(/^::e_(\d+)::(.+)\{$/);
        if (qm && grupoActual) {
            preguntaActual = {
                num: Number(qm[1]),
                texto: qm[2].trim(),
                opciones: []
            };
            grupoActual.preguntas.push(preguntaActual);
            return;
        }

        if ((celda.startsWith("=") || celda.startsWith("~")) && preguntaActual) {
            preguntaActual.opciones.push(celda);
            return;
        }

        if (celda === "}") {
            preguntaActual = null;
        }
    });

    return {
        grupos,
        alumnos: grupos.map(g => g.alumno),
        preguntas: grupos.flatMap(g => g.preguntas)
    };
}

function renderVistaExcel(datos) {
    const bloques = datos.grupos.map(grupo => {
        let bloque = `${grupo.alumno.numero}. ${nombreEnMayusculas(grupo.alumno.nombre)}\n\n`;

        grupo.preguntas.forEach((pregunta, index) => {
            bloque += `${index + 1}. ${pregunta.texto}\n`;

            pregunta.opciones.forEach((op, opIndex) => {
                const textoOpcion = op.replace(/^[=~]\s*/, "").trim();
                const letra = String.fromCharCode(97 + opIndex);
                bloque += `${letra}) ${textoOpcion}\n`;
            });

            bloque += "\n";
        });

        return bloque.trim();
    });

    return bloques.join("\n\n------------------------------\n\n") + "\n";
}

function descargarTXT(nombreArchivo, contenido) {
    const blob = new Blob([contenido], {
        type: "text/plain;charset=utf-8;"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}


async function descargarCarpetaAlumnos(grupos) {
    if (typeof JSZip === "undefined") {
        alert("No se pudo cargar la librería para crear la carpeta ALUMNOS.");
        return;
    }

    const zip = new JSZip();
    const carpeta = zip.folder("ALUMNOS");

    grupos.forEach(grupo => {
        const contenidoAlumno = generarTxtAlumnoDesdeExcel(grupo);
        const nombreArchivo = `${grupo.alumno.numero}. ${limpiarNombreArchivo(nombreEnMayusculas(grupo.alumno.nombre))}.txt`;
        carpeta.file(nombreArchivo, contenidoAlumno);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ALUMNOS.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function limpiarNombreArchivo(nombre) {
    return nombre
        .replace(/[\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim();
}

function generarGiftDesdeGrupos(grupos) {
    let salida = "";

    grupos.forEach(grupo => {
        salida += `$CATEGORY: $course$/top/EXAMENES DE GRADO/${grupo.alumno.numero}.\n\n`;

        grupo.preguntas.forEach((pregunta, index) => {
            salida += `::e_${index + 1}::${pregunta.texto}{\n`;

            pregunta.opciones.forEach((opcion, opIndex) => {
                const opTexto = String(opcion).trim();
                if (!opTexto) return;

                if (/^[=~]/.test(opTexto)) {
                    salida += `${opTexto}\n`;
                } else {
                    salida += `${opIndex === 0 ? "=" : "~"}${opTexto}\n`;
                }
            });

            salida += "}\n\n";
        });
    });

    return salida;
}

function generarGiftDesdeExcel(datos) {
    return generarGiftDesdeGrupos(datos.grupos || []);
}

function generarTxtAlumnoDesdeExcel(grupo) {
    return generarGiftDesdeGrupos([grupo]);
}

function extraerGruposDesdeTexto(texto) {

    const lineas = normalizarLineas(texto);

    let grupos = [];
    let contadorCategoria = 1;

    let i = 0;

    while (i < lineas.length) {

        if (esEncabezadoAlumnos(lineas[i])) {

            let alumnosGrupo = [];

            let nombreInline = limpiarNombreAlumno(lineas[i]);
            if (nombreInline) alumnosGrupo.push(nombreInline);

            i++;

            while (
                i < lineas.length &&
                !/^TEMA/i.test(lineas[i]) &&
                !esEncabezadoAlumnos(lineas[i]) &&
                !esPregunta(lineas[i])
            ) {

                let nombre = limpiarNombreAlumno(lineas[i]);
                if (nombre) alumnosGrupo.push(nombre);

                i++;
            }

            let preguntasGrupo = [];

            while (i < lineas.length) {

                if (esEncabezadoAlumnos(lineas[i])) break;

                if (esPregunta(lineas[i])) {
                    let textoPreguntaLines = [limpiarNumeroPregunta(lineas[i])];
                    i++;

                    while (
                        i < lineas.length &&
                        !esPregunta(lineas[i]) &&
                        !esEncabezadoAlumnos(lineas[i])
                    ) {
                        let letra = getLetraOpcion(lineas[i]);
                        if (letra === 'A') break;
                        textoPreguntaLines.push(lineas[i]);
                        i++;
                    }

                    let textoPregunta = normalizarPregunta(textoPreguntaLines.join(" "));
                    let opciones = [];

                    while (
                        i < lineas.length &&
                        !esPregunta(lineas[i]) &&
                        !esEncabezadoAlumnos(lineas[i])
                    ) {
                        if (esAlternativa(lineas[i])) {
                            let opcion = normalizarAlternativa(lineas[i])
                                .replace(/^[a-e]\)\s*/i, "")
                                .trim();

                            if (opcion) opciones.push(opcion);
                        }

                        i++;
                    }

                    if (textoPregunta && opciones.length) {
                        preguntasGrupo.push({
                            texto: textoPregunta,
                            opciones: opciones
                        });
                    }
                    continue;
                }

                i++;
            }

            alumnosGrupo.forEach((alumnoNombre) => {

                let numero = String(contadorCategoria).padStart(2, "0");

                grupos.push({
                    alumno: {
                        numero,
                        nombre: nombreEnMayusculas(alumnoNombre)
                    },
                    preguntas: preguntasGrupo.map(p => ({
                        texto: p.texto,
                        opciones: [...p.opciones]
                    }))
                });

                contadorCategoria++;

            });

            continue;
        }

        i++;
    }

    return grupos;
}

/* ===============================
   EXPORTAR TXT
================================ */
exportBtn.addEventListener("click", () => {
    if (!textoProcesadoTXT) return;
    const blob = new Blob([textoProcesadoTXT], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "examen.txt";
    a.click();
});

/* ===============================
   PROCESAR TXT
================================ */
function procesarTextoTXT(texto) {
    const lineas = normalizarLineas(texto);
    let r = [], i = 0, n = 1;

    while (i < lineas.length) {
        let l = lineas[i];

        if (esEncabezadoAlumnos(l)) {
            n = 1;

            let nombre = limpiarNombreAlumno(l);
            if (nombre) r.push(nombreEnMayusculas(nombre));

            i++;
            while (
                i < lineas.length &&
                !/^TEMA/i.test(lineas[i]) &&
                !esEncabezadoAlumnos(lineas[i]) &&
                !esPregunta(lineas[i])
            ) {
                let x = limpiarNombreAlumno(lineas[i]);
                if (x) r.push(nombreEnMayusculas(x));
                i++;
            }
            continue;
        }

        if (/^TEMA/i.test(l)) {
            r.push("TEMA: " + l.replace(/TEMA\s*:/i, "").trim());
            i++;
            continue;
        }

        if (esPregunta(l)) {
            let textoPreguntaLines = [l.replace(/^\d+\.\s*/, "")];
            i++;

            // Primero recolectamos todo el texto de la pregunta hasta encontrar la primera opción (A) o nuevo encabezado
            while (i < lineas.length && !esPregunta(lineas[i]) && !esEncabezadoAlumnos(lineas[i])) {
                let letra = getLetraOpcion(lineas[i]);
                if (letra === 'A') break;
                textoPreguntaLines.push(lineas[i]);
                i++;
            }

            r.push(`${n}. ${normalizarPregunta(textoPreguntaLines.join(" "))}`);

            // Luego recolectamos las opciones, deteniéndonos si empieza otro examen o pregunta
            while (i < lineas.length && !esPregunta(lineas[i]) && !esEncabezadoAlumnos(lineas[i])) {
                if (esOpcion(lineas[i])) r.push(normalizarAlternativa(lineas[i]));
                i++;
            }
            r.push("");
            n++;
            continue;
        }

        i++;
    }

    return r.join("\n");
}

/* ===============================
   EXPORTAR EXCEL
================================ */
exportExcelBtn.addEventListener("click", () => {
    if (!textoOriginal) return;
    const filas = procesarTextoExcel(textoOriginal);
    if (!filas.length) return alert("No hay datos válidos");
    const ws = XLSX.utils.aoa_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EXAMEN");
    XLSX.writeFile(wb, "examenes_grado.xlsx");
});

/* ===============================
   PROCESAR EXCEL
================================ */
function procesarTextoExcel(texto) {
    const l = normalizarLineas(texto);
    let filas = [], alumnos = [], preguntas = [];
    let cat = 1, num = 1;

    function cerrar() {
        if (!alumnos.length || !preguntas.length) return;

        alumnos.forEach(a => {
            filas.push([
                `$CATEGORY: $course$/top/EXAMENES DE GRADO/${String(cat++).padStart(2, "0")}. ${nombreEnMayusculas(a)}`
            ]);
            filas.push([""]);
        });

        preguntas.forEach(p => {
            filas.push([`::e_${p.num}::${p.texto}{`]);
            p.opciones.forEach((o, i) => {
                let limpio = normalizarAlternativa(o).replace(/^[a-e]\)\s*/i, "");
                filas.push([(i === 0 ? "=" : "~") + limpio]);
            });
            filas.push(["}"]);
            filas.push([""]);
        });

        alumnos = [];
        preguntas = [];
        num = 1;
    }

    let i = 0;
    while (i < l.length) {
        if (esEncabezadoAlumnos(l[i])) {
            cerrar();

            let nombre = limpiarNombreAlumno(l[i]);
            if (nombre) alumnos.push(nombreEnMayusculas(nombre));

            i++;
            while (
                i < l.length &&
                !/^TEMA/i.test(l[i]) &&
                !esEncabezadoAlumnos(l[i]) &&
                !esPregunta(l[i])
            ) {
                let x = limpiarNombreAlumno(l[i]);
                if (x) alumnos.push(nombreEnMayusculas(x));
                i++;
            }
            continue;
        }

        if (esPregunta(l[i])) {
            let textoPreguntaLines = [l[i].replace(/^\d+\.\s*/, "")];
            i++;

            // Recolectar enunciado multi-línea hasta encontrar A o nuevo encabezado
            while (i < l.length && !esPregunta(l[i]) && !esEncabezadoAlumnos(l[i])) {
                let letra = getLetraOpcion(l[i]);
                if (letra === 'A') break;
                textoPreguntaLines.push(l[i]);
                i++;
            }

            let textoCompleto = normalizarPregunta(textoPreguntaLines.join(" "));
            let ops = [];

            while (i < l.length && !esPregunta(l[i]) && !esEncabezadoAlumnos(l[i])) {
                if (esOpcion(l[i])) ops.push(l[i]);
                i++;
            }
            preguntas.push({ num: num++, texto: textoCompleto, opciones: ops });
            continue;
        }

        i++;
    }

    cerrar();
    return filas;
}

/* ===============================
   LIMPIAR
================================ */
clearBtn.addEventListener("click", () => {
    output.value = "";
    textoOriginal = "";
    textoProcesadoTXT = "";
    datosExcelCargado = null;
    restablecerDropZone();
});

/* ===============================
   EXPORTAR LISTA DE ALUMNOS
================================ */
function limpiarNombreAlumno(texto) {

    let limpio = texto
        .replace(RE_ENCABEZADO_ALUMNOS, "")
        // Eliminar información de contacto (celular, etc.) y cualquier residuo de "/ cel:", "celular:", etc.
        .replace(/[\/\s]*\b(celular|cel|CELULAR|CEL)\b\s*:?\s*[\d\s\.\-]*/gi, "")
        .replace(/^[_•\-\s]+/, "")
        .replace(/,/g, "")
        .trim();

    // evitar encabezados sin nombre
    if (
        /^(ALUMNOS?|ALUMNAS?|ALUMNOS\(AS\)|ALUMNO\(A\)|ALUMNA\(O\)|APELLIDOS Y NOMBRES)$/i.test(limpio)
    ) {
        return "";
    }

    return nombreEnMayusculas(limpio);
}

exportAlumnosBtn.addEventListener("click", () => {

    if (!textoOriginal) {
        alert("Primero carga un archivo.");
        return;
    }

    const lineas = normalizarLineas(textoOriginal);

    let alumnos = [];

    for (let i = 0; i < lineas.length; i++) {

        if (esEncabezadoAlumnos(lineas[i])) {

            // alumno en la misma línea
            let nombre = limpiarNombreAlumno(lineas[i]);

            if (nombre) alumnos.push(nombre);

            i++;

            // alumnos en líneas siguientes
            while (
                i < lineas.length &&
                !esEncabezadoAlumnos(lineas[i]) &&
                !/^TEMA/i.test(lineas[i]) &&
                !esPregunta(lineas[i], lineas[i - 1])
            ) {

                let alumno = limpiarNombreAlumno(lineas[i]);

                if (alumno) alumnos.push(alumno);

                i++;
            }
        }
    }

    if (!alumnos.length) {
        alert("No se encontraron alumnos.");
        return;
    }

    // eliminar duplicados por seguridad
    alumnos = [...new Set(alumnos)];

    // enumerar
    const textoLista = alumnos
        .map((a, index) => `${index + 1}. ${nombreEnMayusculas(a)}`)
        .join("\n");

    // descargar
    const blob = new Blob([textoLista], { type: "text/plain;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "lista_alumnos.txt";
    link.click();

    URL.revokeObjectURL(link.href);

});

function procesarTextoGiftTXT(texto) {
    const grupos = extraerGruposDesdeTexto(texto);
    return generarGiftDesdeGrupos(grupos);
}

const exportGiftTxtBtn = document.getElementById("exportGiftTxtBtn");


exportGiftTxtBtn.addEventListener("click", () => {

    let contenido = "";

    if (datosExcelCargado) {
        contenido = generarGiftDesdeExcel(datosExcelCargado);
    } else {
        if (!textoOriginal) {
            alert("Primero carga un archivo.");
            return;
        }
        contenido = procesarTextoGiftTXT(textoOriginal);
    }

    if (!contenido) {
        alert("No se generó contenido.");
        return;
    }

    descargarTXT("banco_moodle.txt", contenido);

});

exportStudentTxtBtn.addEventListener("click", async () => {

    let grupos = [];

    if (datosExcelCargado && datosExcelCargado.grupos) {
        grupos = datosExcelCargado.grupos;
    } else if (textoOriginal) {
        grupos = extraerGruposDesdeTexto(textoOriginal);
    } else {
        alert("Primero carga un archivo.");
        return;
    }

    if (!grupos.length || !grupos.some(g => g.preguntas.length)) {
        alert("No hay datos suficientes para exportar archivos por alumno.");
        return;
    }

    await descargarCarpetaAlumnos(grupos);
});

/* ===============================
   DRAG AND DROP & ANÁLISIS DE CALIDAD
================================ */

function procesarArchivo(file) {
    if (!file) return;

    // Actualizar nombre del archivo
    const fileNameElement = document.getElementById("fileName");
    fileNameElement.textContent = file.name;
    fileNameElement.style.display = "inline-flex";

    // Actualizar estado del drop zone
    const dropZone = document.getElementById("dropZone");
    dropZone.classList.add("has-file");

    const dropZoneContent = document.getElementById("dropZoneContent");
    dropZoneContent.innerHTML = `
        <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span class="drop-zone-text">¡Archivo cargado con éxito!</span>
        <span class="drop-zone-subtext">${file.name}</span>
    `;

    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "docx") leerWord(file);
    else if (ext === "txt") leerTXT(file);
    else if (ext === "xlsx") leerExcel(file);
    else {
        alert("Formato no soportado. Por favor, sube un archivo .docx, .txt o .xlsx");
        restablecerDropZone();
    }
}

function restablecerDropZone() {
    const dropZone = document.getElementById("dropZone");
    if (dropZone) {
        dropZone.className = "drop-zone";
    }

    const dropZoneContent = document.getElementById("dropZoneContent");
    if (dropZoneContent) {
        dropZoneContent.innerHTML = `
            <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="drop-zone-text">Arrastra tu examen aquí o <span class="highlight-text">selecciona un archivo</span></span>
            <span class="drop-zone-subtext">Soporta formatos DOCX y TXT</span>
        `;
    }

    const fileNameElement = document.getElementById("fileName");
    if (fileNameElement) {
        fileNameElement.textContent = "Ningún archivo seleccionado";
        fileNameElement.style.display = "none";
    }

    if (fileInput) {
        fileInput.value = "";
    }

    // Ocultar panel de análisis
    renderizarAnalisisDashboard(null);
}

function ejecutarAnalisis() {
    let grupos = [];
    if (datosExcelCargado && datosExcelCargado.grupos) {
        grupos = datosExcelCargado.grupos;
    } else if (textoOriginal) {
        grupos = extraerGruposDesdeTexto(textoOriginal);
    }

    const resultado = analizarEstructuraPreguntas(grupos);
    renderizarAnalisisDashboard(resultado || { totalAlumnos: 0, totalPreguntas: 0, advertencias: [] });
}

function analizarEstructuraPreguntas(grupos) {
    if (!grupos || !grupos.length) return null;

    let totalAlumnos = grupos.length;
    let totalPreguntas = 0;
    let advertenciasMapa = new Map();

    grupos.forEach(grupo => {
        const alumnoNombre = grupo.alumno ? (grupo.alumno.nombre || "Desconocido") : "Desconocido";
        const preguntas = grupo.preguntas || [];
        preguntas.forEach((pregunta, idx) => {
            totalPreguntas++;
            const numAlternativas = pregunta.opciones ? pregunta.opciones.length : 0;
            if (numAlternativas !== 5) {
                const numeroPregunta = idx + 1;
                const textoPregunta = pregunta.texto || "Sin enunciado";

                // Generar una clave única combinando el número de pregunta y el texto normalizado
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
        advertencias
    };
}

function renderizarAnalisisDashboard(resultado) {
    const panel = document.getElementById("analysisPanel");
    if (!panel) return;

    if (!resultado) {
        panel.style.display = "none";
        panel.innerHTML = "";
        return;
    }

    panel.style.display = "block";

    const totalAlumnos = resultado.totalAlumnos;
    const totalPreguntas = resultado.totalPreguntas;
    const numAdvertencias = resultado.advertencias.length;

    let statusHtml = "";
    if (totalPreguntas === 0) {
        statusHtml = `
            <div class="status-banner error">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span><strong>Error de Análisis:</strong> No se detectaron preguntas en el archivo cargado. Verifica que el archivo no esté vacío y que las preguntas sigan el formato correcto (ej. "1. ¿Enunciado?").</span>
            </div>
        `;
    } else if (numAdvertencias === 0) {
        statusHtml = `
            <div class="status-banner success">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span><strong>¡Estructura Correcta!</strong> Todas las preguntas de los exámenes cargados contienen exactamente las 5 alternativas reglamentarias (a-e).</span>
            </div>
        `;
    } else {
        statusHtml = `
            <div class="status-banner warning">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span><strong>Atención:</strong> Se detectaron <strong>${numAdvertencias}</strong> preguntas que no cumplen con las 5 alternativas requeridas (a-e). Por favor, verifica el listado a continuación.</span>
            </div>
        `;
    }

    let warningListHtml = "";
    if (numAdvertencias > 0) {
        warningListHtml = `
            <div class="warning-list-container">
                <div class="warning-list-title">Detalle de Inconsistencias de Alternativas:</div>
                <div class="warning-list">
                    ${resultado.advertencias.map(adv => `
                        <div class="warning-item">
                            <div class="warning-header">
                                <span class="warning-student">${adv.alumno}</span>
                                <span class="warning-badge">${adv.cantidadAlternativas} alternativas</span>
                            </div>
                            <div class="warning-desc">Pregunta ${adv.numeroPregunta}: "${adv.textoPregunta}"</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    panel.innerHTML = `
        <div class="analysis-header-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>
            Análisis de Calidad del Examen
        </div>
        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-title">Total Alumnos</span>
                <span class="kpi-value">${totalAlumnos}</span>
            </div>
            <div class="kpi-card ${totalPreguntas === 0 ? 'error-active' : ''}">
                <span class="kpi-title">Total Preguntas</span>
                <span class="kpi-value">${totalPreguntas}</span>
            </div>
            <div class="kpi-card ${numAdvertencias > 0 && totalPreguntas > 0 ? 'warning-active' : ''}">
                <span class="kpi-title">Advertencias (≠ 5 Alts)</span>
                <span class="kpi-value">${numAdvertencias}</span>
            </div>
        </div>
        ${statusHtml}
        ${warningListHtml}
    `;
}

// Configuración de Eventos de Arrastrar y Soltar (Drag & Drop)
const dropZone = document.getElementById("dropZone");

if (dropZone) {
    // Evitar comportamientos por defecto para drag & drop
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        window.addEventListener(eventName, e => e.preventDefault(), false);
        dropZone.addEventListener(eventName, e => e.preventDefault(), false);
    });

    // Resaltar la zona de drop al arrastrar archivo encima
    ["dragenter", "dragover"].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add("drag-over");
        }, false);
    });

    ["dragleave", "dragend"].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove("drag-over");
        }, false);
    });

    // Capturar el archivo soltado
    dropZone.addEventListener("drop", e => {
        dropZone.classList.remove("drag-over");
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) {
            procesarArchivo(file);
        }
    });

    // Clic en la zona de drop abre el explorador de archivos nativo
    dropZone.addEventListener("click", () => {
        fileInput.click();
    });
}

