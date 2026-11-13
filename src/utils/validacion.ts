import { HttpError } from "./http-error.js";

export function idDeRuta(valor: string | string[] | undefined, nombre = "id"): number {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(400, `El parámetro ${nombre} debe ser un entero positivo`);
    }
    return id;
}

export function enteroPositivo(valor: unknown, campo: string): number {
    if (typeof valor !== "number" || !Number.isInteger(valor) || valor <= 0) {
        throw new HttpError(400, `El campo '${campo}' es obligatorio y debe ser un entero positivo`);
    }
    return valor;
}

export function numero(valor: unknown, campo: string, { positivo = false } = {}): number {
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
        throw new HttpError(400, `El campo '${campo}' es obligatorio y debe ser numérico`);
    }
    if (positivo ? valor <= 0 : valor < 0) {
        throw new HttpError(400, `El campo '${campo}' debe ser ${positivo ? "mayor que 0" : "mayor o igual a 0"}`);
    }
    return valor;
}

export function texto(valor: unknown, campo: string, max: number): string {
    if (typeof valor !== "string" || valor.trim() === "") {
        throw new HttpError(400, `El campo '${campo}' es obligatorio y debe ser texto`);
    }
    const limpio = valor.trim();
    if (limpio.length > max) {
        throw new HttpError(400, `El campo '${campo}' admite máximo ${max} caracteres`);
    }
    return limpio;
}

export function textoOpcional(valor: unknown, campo: string, max: number): string | null {
    return valor === undefined || valor === null ? null : texto(valor, campo, max);
}

export function unoDe<T extends string>(valor: unknown, campo: string, permitidos: readonly T[]): T {
    if (typeof valor !== "string" || !permitidos.includes(valor as T)) {
        throw new HttpError(400, `El campo '${campo}' debe ser uno de: ${permitidos.join(", ")}`);
    }
    return valor as T;
}
