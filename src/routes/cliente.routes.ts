import { Router } from "express";
import * as clienteController from "../controllers/cliente.controller.js";

const router = Router();

router.get("/clientes/:id/envios", clienteController.historialEnvios);

export default router;
