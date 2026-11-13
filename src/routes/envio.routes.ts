import { Router } from "express";
import * as envioController from "../controllers/envio.controller.js";

const router = Router();

router.get("/envios", envioController.listarActivos);
router.post("/envios", envioController.crear);
router.put("/envios/:id/costo", envioController.actualizarCosto);
router.post("/envios/:id/rastreo", envioController.agregarRastreo);

export default router;
