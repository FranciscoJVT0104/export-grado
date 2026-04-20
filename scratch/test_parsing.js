
function normalizarPregunta(texto) {
    let t = String(texto || "").trim();

    const tieneInicio = t.includes("¿");
    const tieneFin = t.includes("?");

    if (tieneInicio && tieneFin) {
        t = t.replace(/¿\s+/g, "¿").replace(/\s+\?/g, "?");
    } else {
        t = t.replace(/[¿?]/g, "");
    }

    return t.toUpperCase();
}

const testCases = [
    { in: "¿ Los instrumentos ?", out: "¿LOS INSTRUMENTOS?" },
    { in: "¿ Los instrumentos", out: "LOS INSTRUMENTOS" },
    { in: "Los instrumentos ?", out: "LOS INSTRUMENTOS" },
    { in: "¿POR QUÉ?", out: "¿POR QUÉ?" },
    { in: "Prueba sin signos", out: "PRUEBA SIN SIGNOS" }
];

console.log("--- TESTING QUESTION MARK SANITIZATION ---");
testCases.forEach(tc => {
    const res = normalizarPregunta(tc.in);
    console.log(`Input:    "${tc.in}"`);
    console.log(`Result:   "${res}"`);
    console.log(`Expected: "${tc.out}"`);
    console.log('-------------------');
});
