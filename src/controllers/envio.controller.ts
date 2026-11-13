import { Request, Response } from "express";
import * as envioService from "../services/envio.service.js";
import { idDeRuta } from "../utils/validacion.js";

export async function crear(req: Request, res: Response) {
    const envio = await envioService.crearEnvio(req.body ?? {});
    res.status(201).json({ status: "success", data: envio });
}

export async function actualizarCosto(req: Request, res: Response) {
    const data = await envioService.actualizarCosto(idDeRuta(req.params.id), req.body ?? {});
    res.json({ status: "success", data });
}

export async function agregarRastreo(req: Request, res: Response) {
    const data = await envioService.agregarRastreo(idDeRuta(req.params.id), req.body ?? {});
    res.status(201).json({ status: "success", data });
}

export async function listarActivos(_req: Request, res: Response) {
    const envios = await envioService.listarEnviosActivos();
    res.json({ status: "success", total: envios.length, data: envios });
}
