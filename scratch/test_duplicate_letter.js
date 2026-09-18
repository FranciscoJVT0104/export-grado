const assert = require('assert');

function getLetraOpcion(linea) {
    const match = String(linea || "").match(/^\s*[*+•]?\s*\(?\s*([a-eA-E])\s*[\.\)\:\-\/]+(?:\s+|$|(?=[A-Za-zÁÉÍÓÚáéíóúÑñ0-9]))/);
    return match ? match[1].toUpperCase() : null;
}

function normalizarAlternativa(linea, letraForzada) {
    const match = String(linea || "").trim().match(/^\s*[*+•]?\s*\(?\s*([a-eA-E])\s*[\.\)\:\-\/]+\s*(.*)$/);
    if (!match) return String(linea || "").trim();

    const letra = letraForzada ? letraForzada.toLowerCase() : match[1].toLowerCase();
    let texto = match[2].trim();

    texto = texto
        .replace(/\s*[\+\*]\s*$/, "")
        .replace(/\s*[\(\[]\s*(?:x|v|f|correcta|correcto)\s*[\)\]]\s*$/gi, "")
        .replace(/[\+\*]+$/, "")
        .trim();

    texto = texto.replace(/^[\:\-\/\.\s]+/, "").trim();

    if (texto) {
        texto = texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
        texto = texto.replace(/\.+$|\s+$/, "") + ".";
    }

    return `${letra}) ${texto}`.trim();
}

// Test case from user's screenshot
const rawOptions = [
    "a) Rifampicina y cotrimoxazol.",
    "b) Doxiciclina y estreptomicina.",
    "b) Estreptomicina y rifampicina.",
    "c) Doxiciclina y cotrimoxazol.",
    "d) Ceftriaxona y doxiciclina."
];

const normalizedWithLetters = rawOptions.map((opt, idx) => {
    const letraEsperada = String.fromCharCode(97 + idx); // a, b, c, d, e
    return normalizarAlternativa(opt, letraEsperada);
});

console.log("=== OPCIONES NORMALIZADAS SECUENCIALMENTE ===");
normalizedWithLetters.forEach(o => console.log(o));

assert.strictEqual(normalizedWithLetters[0].startsWith("a)"), true);
assert.strictEqual(normalizedWithLetters[1].startsWith("b)"), true);
assert.strictEqual(normalizedWithLetters[2].startsWith("c)"), true);
assert.strictEqual(normalizedWithLetters[3].startsWith("d)"), true);
assert.strictEqual(normalizedWithLetters[4].startsWith("e)"), true);

// Test detection of letters
const letrasDetectadas = rawOptions.map(opt => getLetraOpcion(opt).toLowerCase());
console.log("\nLetras detectadas:", letrasDetectadas);
assert.deepStrictEqual(letrasDetectadas, ['a', 'b', 'b', 'c', 'd']);

const numAlternativas = letrasDetectadas.length;
const letrasStr = letrasDetectadas.join("");
const esFormatoCorrecto = numAlternativas === 5 && letrasStr === "abcde";
console.log("¿Es formato correcto a-e?", esFormatoCorrecto);
assert.strictEqual(esFormatoCorrecto, false);

// Detection of duplicates and missing
const conteoLetras = {};
letrasDetectadas.forEach(l => { conteoLetras[l] = (conteoLetras[l] || 0) + 1; });
const repetidas = Object.keys(conteoLetras).filter(l => conteoLetras[l] > 1);
const esperadas = ['a', 'b', 'c', 'd', 'e'];
const faltantes = esperadas.filter(l => !letrasDetectadas.includes(l));

console.log("Repetidas:", repetidas);
console.log("Faltantes:", faltantes);

assert.deepStrictEqual(repetidas, ['b']);
assert.deepStrictEqual(faltantes, ['e']);

console.log("\n¡Prueba de detección y corrección exitosa!");
