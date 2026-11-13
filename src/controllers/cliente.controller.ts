import { Request, Response } from "express";
import * as clienteService from "../services/cliente.service.js";
import { idDeRuta } from "../utils/validacion.js";

export async function historialEnvios(req: Request, res: Response) {
    const data = await clienteService.historialEnviosCliente(idDeRuta(req.params.id));
    res.json({ status: "success", data });
}
