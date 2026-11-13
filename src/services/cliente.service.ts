import { AppDataSource } from "../config/data-source.js";
import { Cliente } from "../entity/Cliente.js";
import { Envio } from "../entity/Envio.js";
import { HttpError } from "../utils/http-error.js";

export async function historialEnviosCliente(clienteId: number) {
    const cliente = await AppDataSource.getRepository(Cliente).findOneBy({ id: clienteId });
    if (!cliente) throw new HttpError(404, `El cliente ${clienteId} no existe`);

    const envios = await AppDataSource.getRepository(Envio).find({
        where: { cliente: { id: clienteId } },
        relations: { direccionOrigen: true, direccionDestino: true, paquetes: true },
        order: { fecha: "DESC", paquetes: { id: "ASC" } },
    });

    return {
        cliente: { id: cliente.id, nombre: cliente.nombre, estado: cliente.estado },
        totalEnvios: envios.length,
        envios,
    };
}
