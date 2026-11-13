import { AppDataSource } from "../config/data-source.js";
import { Almacen } from "../entity/Almacen.js";
import { Envio } from "../entity/Envio.js";
import { Paquete } from "../entity/Paquete.js";
import { HttpError } from "../utils/http-error.js";
import { enteroPositivo } from "../utils/validacion.js";
import { validarEnvioAbierto } from "./envio.service.js";
import { leerDatosPaquete } from "./paquete.validacion.js";

export async function asignarPaquete(almacenId: number, body: Record<string, unknown>) {
    const envioId = enteroPositivo(body.envioId, "envioId");
    const datos = leerDatosPaquete(body);

    const almacen = await AppDataSource.getRepository(Almacen).findOneBy({ id: almacenId });
    if (!almacen) throw new HttpError(404, `El almacén ${almacenId} no existe`);

    const envio = await AppDataSource.getRepository(Envio).findOneBy({ id: envioId });
    if (!envio) throw new HttpError(400, `El envío ${envioId} no existe`);
    validarEnvioAbierto(envio);

    const paqueteRepo = AppDataSource.getRepository(Paquete);

    const resultado = await paqueteRepo.insert({ ...datos, envio: { id: envioId }, almacen: { id: almacenId } });
    const paqueteId = resultado.identifiers[0]?.id as number;

    const ocupados = await paqueteRepo.countBy({ almacen: { id: almacenId } });

    return {
        paquete: await paqueteRepo.findOne({ where: { id: paqueteId }, relations: { envio: true } }),
        almacen: {
            id: almacen.id,
            nombre: almacen.nombre,
            capacidadMaxima: almacen.capacidadMaxima,
            ocupados,
            disponibles: almacen.capacidadMaxima - ocupados,
        },
    };
}
