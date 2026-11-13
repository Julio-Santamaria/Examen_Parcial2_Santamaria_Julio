import { Router } from "express";
import * as almacenController from "../controllers/almacen.controller.js";

const router = Router();

router.post("/almacenes/:id/paquetes", almacenController.asignarPaquete);

export default router;
