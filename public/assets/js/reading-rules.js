const PRE_READER_LEVELS = {
    nivel1: {
        perfil: "Pre-leitor - Nivel 1",
        criterio: "Nao realizou a leitura de palavras ou leu letras, silabas ou palavras fora do item."
    },
    nivel2: {
        perfil: "Pre-leitor - Nivel 2",
        criterio: "Nomeou letras isoladas ao tentar ler as palavras do item."
    },
    nivel3: {
        perfil: "Pre-leitor - Nivel 3",
        criterio: "Silabou ao realizar a leitura das palavras do item."
    },
    nivel4: {
        perfil: "Pre-leitor - Nivel 4",
        criterio: "Leu corretamente ate 10 palavras conhecidas e ate 5 palavras possivelmente desconhecidas."
    }
};
export function clampRoundedNumber(value, minimum, maximum) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue))
        return minimum;
    return Math.min(maximum, Math.max(minimum, Math.round(numberValue)));
}
export function classifyReadingProfile(knownCorrect, difficultCorrect, textCorrect, precision, observation = "auto") {
    const known = clampRoundedNumber(knownCorrect, 0, 60);
    const difficult = clampRoundedNumber(difficultCorrect, 0, 40);
    const text = clampRoundedNumber(textCorrect, 0, 100);
    const safePrecision = clampRoundedNumber(precision, 0, 100);
    if (text > 65 && safePrecision > 90) {
        return {
            perfil: "Leitor Fluente",
            criterio: "Leu mais de 65 palavras corretas no texto narrativo, com precisao superior a 90%."
        };
    }
    if (known >= 11 && difficult >= 6) {
        return {
            perfil: "Leitor Iniciante",
            criterio: "Leu 11 ou mais palavras conhecidas e 6 ou mais palavras possivelmente desconhecidas."
        };
    }
    const selectedLevel = observation === "auto"
        ? known === 0 && difficult === 0
            ? "nivel1"
            : "nivel4"
        : observation;
    return PRE_READER_LEVELS[selectedLevel];
}
export function calculateAutomaticPrecision(correctWords, attemptedWords) {
    const correct = clampRoundedNumber(correctWords, 0, 100);
    const attempted = clampRoundedNumber(attemptedWords, 0, 100);
    if (attempted <= 0)
        return 0;
    return clampRoundedNumber((correct / attempted) * 100, 0, 100);
}
export function validateManualPrecision(value) {
    return clampRoundedNumber(value, 0, 100);
}
//# sourceMappingURL=reading-rules.js.map