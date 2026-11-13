import { AppDataSource } from "../config/data-source.js";
import { Almacen } from "../entity/Almacen.js";
import { AuditoriaEnvio } from "../entity/AuditoriaEnvio.js";
import { Cliente } from "../entity/Cliente.js";
import { Direccion } from "../entity/Direccion.js";
import { Envio } from "../entity/Envio.js";
import { ESTADOS_ENVIO } from "../entity/estados.js";
import { HistorialRastreo } from "../entity/HistorialRastreo.js";
import { Paquete } from "../entity/Paquete.js";
import { HttpError } from "../utils/http-error.js";
import { enteroPositivo, numero, texto, textoOpcional, unoDe } from "../utils/validacion.js";
import { leerDatosPaquete } from "./paquete.validacion.js";

const envioRepo = () => AppDataSource.getRepository(Envio);

export function validarEnvioAbierto(envio: Envio): void {
    if (envio.estado === "ENTREGADO" || envio.estado === "CANCELADO") {
        throw new HttpError(400, `El envío ${envio.id} ya está ${envio.estado} y no admite cambios`);
    }
}

export async function buscarEnvioOFallar(id: number): Promise<Envio> {
    const envio = await envioRepo().findOneBy({ id });
    if (!envio) throw new HttpError(404, `El envío ${id} no existe`);
    return envio;
}

function obtenerEnvioCompleto(id: number): Promise<Envio | null> {
    return envioRepo().findOne({
        where: { id },
        relations: { cliente: true, direccionOrigen: true, direccionDestino: true, paquetes: { almacen: true } },
        order: { paquetes: { id: "ASC" } },
    });
}

export async function crearEnvio(body: Record<string, unknown>) {
    const clienteId = enteroPositivo(body.clienteId, "clienteId");
    const direccionOrigenId = enteroPositivo(body.direccionOrigenId, "direccionOrigenId");
    const direccionDestinoId = enteroPositivo(body.direccionDestinoId, "direccionDestinoId");
    const destinatario = texto(body.destinatario, "destinatario", 100);
    const costoTotal = numero(body.costoTotal, "costoTotal");

    if (!Array.isArray(body.paquetes) || body.paquetes.length === 0) {
        throw new HttpError(400, "El campo 'paquetes' es obligatorio y debe traer al menos un paquete");
    }
    const paquetes = body.paquetes.map((p: unknown, i: number) => {
        const almacenId = (p as Record<string, unknown> | null)?.almacenId;
        return {
            ...leerDatosPaquete(p, `paquetes[${i}].`),
            almacenId: almacenId === undefined || almacenId === null ? null : enteroPositivo(almacenId, `paquetes[${i}].almacenId`),
        };
    });

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let envioId: number;
    try {
        const m = queryRunner.manager;

        const cliente = await m.findOneBy(Cliente, { id: clienteId });
        if (!cliente) throw new HttpError(400, `El cliente ${clienteId} no existe`);
        if (cliente.estado === "INACTIVO") throw new HttpError(400, `El cliente ${clienteId} está INACTIVO`);

        const origen = await m.findOne(Direccion, { where: { id: direccionOrigenId, cliente: { id: clienteId } } });
        if (!origen) throw new HttpError(400, `La dirección ${direccionOrigenId} no existe o no pertenece al cliente`);
        const destino = await m.findOne(Direccion, { where: { id: direccionDestinoId, cliente: { id: clienteId } } });
        if (!destino) throw new HttpError(400, `La dirección ${direccionDestinoId} no existe o no pertenece al cliente`);

        const envio = await m.save(
            m.create(Envio, { cliente, direccionOrigen: origen, direccionDestino: destino, destinatario, costoTotal, estado: "REGISTRADO" }),
        );
        envioId = envio.id;

        for (const { almacenId, ...datos } of paquetes) {
            if (almacenId !== null && !(await m.existsBy(Almacen, { id: almacenId }))) {
                throw new HttpError(400, `El almacén ${almacenId} no existe`);
            }
            await m.insert(Paquete, { ...datos, envio: { id: envio.id }, almacen: almacenId === null ? null : { id: almacenId } });
        }

        await m.insert(HistorialRastreo, {
            envio: { id: envio.id },
            ubicacionActual: origen.ciudad,
            estadoEvento: "REGISTRADO",
            observaciones: "Envío registrado desde la API",
        });

        await queryRunner.commitTransaction();
    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }

    return obtenerEnvioCompleto(envioId);
}

export async function actualizarCosto(id: number, body: Record<string, unknown>) {
    const costoTotal = numero(body.costoTotal, "costoTotal");
    const usuario = texto(body.usuario, "usuario", 100);

    const envio = await buscarEnvioOFallar(id);
    if (envio.estado === "CANCELADO") {
        throw new HttpError(400, `El envío ${id} está CANCELADO; no se puede modificar su costo`);
    }
    const costoAnterior = envio.costoTotal;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
        await queryRunner.query("SET @usuario_app = ?", [usuario]);
        await queryRunner.manager.update(Envio, { id }, { costoTotal });
    } finally {
        await queryRunner.query("SET @usuario_app = NULL").catch(() => undefined);
        await queryRunner.release();
    }

    const auditoria =
        costoAnterior === costoTotal
            ? null
            : await AppDataSource.getRepository(AuditoriaEnvio).findOne({ where: { envio: { id } }, order: { id: "DESC" } });

    return {
        envio: await envioRepo().findOneBy({ id }),
        auditoria,
        mensaje: auditoria ? "Costo actualizado; el trigger registró la auditoría" : "El costo es el mismo; no se generó auditoría",
    };
}

export async function agregarRastreo(id: number, body: Record<string, unknown>) {
    const ubicacionActual = texto(body.ubicacionActual, "ubicacionActual", 150);
    const estadoEvento = unoDe(body.estadoEvento, "estadoEvento", ESTADOS_ENVIO);
    const observaciones = textoOpcional(body.observaciones, "observaciones", 255);

    const envio = await buscarEnvioOFallar(id);
    validarEnvioAbierto(envio);
    const estadoAnterior = envio.estado;

    const resultado = await AppDataSource.getRepository(HistorialRastreo).insert({
        envio: { id },
        ubicacionActual,
        estadoEvento,
        observaciones,
    });
    const rastreoId = resultado.identifiers[0]?.id as number;

    const envioActualizado = await buscarEnvioOFallar(id);

    return {
        rastreo: await AppDataSource.getRepository(HistorialRastreo).findOneBy({ id: rastreoId }),
        envio: {
            id,
            estadoAnterior,
            estadoActual: envioActualizado.estado,
            fechaEntrega: envioActualizado.fechaEntrega,
        },
    };
}

export function listarEnviosActivos() {
    return envioRepo()
        .createQueryBuilder("e")
        .innerJoinAndSelect("e.cliente", "cliente")
        .innerJoinAndSelect("e.direccionOrigen", "origen")
        .innerJoinAndSelect("e.direccionDestino", "destino")
        .leftJoinAndSelect("e.paquetes", "paquete")
        .leftJoinAndSelect("paquete.almacen", "almacen")
        .where("e.estado IN (:...estados)", { estados: ["REGISTRADO", "EN_TRANSITO"] })
        .orderBy("e.fecha", "DESC")
        .addOrderBy("paquete.id", "ASC")
        .getMany();
}
