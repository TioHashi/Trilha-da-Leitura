export type ReadingProfile = "Leitor Fluente" | "Leitor Iniciante" | "Pre-leitor - Nivel 1" | "Pre-leitor - Nivel 2" | "Pre-leitor - Nivel 3" | "Pre-leitor - Nivel 4";
export type PreReaderObservation = "auto" | "nivel1" | "nivel2" | "nivel3" | "nivel4";
export interface ReadingClassification {
    perfil: ReadingProfile;
    criterio: string;
}
export declare function clampRoundedNumber(value: unknown, minimum: number, maximum: number): number;
export declare function classifyReadingProfile(knownCorrect: number, difficultCorrect: number, textCorrect: number, precision: number, observation?: PreReaderObservation): ReadingClassification;
export declare function calculateAutomaticPrecision(correctWords: number, attemptedWords: number): number;
export declare function validateManualPrecision(value: unknown): number;
