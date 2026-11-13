import { Request, Response } from "express";
import * as almacenService from "../services/almacen.service.js";
import { esErrorDeTrigger } from "../utils/http-error.js";
import { idDeRuta } from "../utils/validacion.js";

export async function asignarPaquete(req: Request, res: Response) {
    const almacenId = idDeRuta(req.params.id);
    try {
        const data = await almacenService.asignarPaquete(almacenId, req.body ?? {});
        res.status(201).json({ status: "success", data });
    } catch (err) {
        if (esErrorDeTrigger(err)) {
            return res.status(400).json({
                status: "error",
                sqlState: err.sqlState,
                message: err.sqlMessage,
            });
        }
        throw err;
    }
}
