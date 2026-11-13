import { HttpError } from "../utils/http-error.js";
import { numero, texto } from "../utils/validacion.js";

export interface DatosPaquete {
    peso: number;
    dimensiones: string;
    contenido: string;
}

export function leerDatosPaquete(body: unknown, prefijo = ""): DatosPaquete {
    if (typeof body !== "object" || body === null) {
        throw new HttpError(400, `${prefijo || "El paquete"} debe ser un objeto JSON`);
    }
    const p = body as Record<string, unknown>;
    return {
        peso: numero(p.peso, `${prefijo}peso`, { positivo: true }),
        dimensiones: texto(p.dimensiones, `${prefijo}dimensiones`, 30),
        contenido: texto(p.contenido, `${prefijo}contenido`, 150),
    };
}
