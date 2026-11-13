import express, { NextFunction, Request, Response } from 'express';
import envioRoutes from './routes/envio.routes.js';
import almacenRoutes from './routes/almacen.routes.js';
import clienteRoutes from './routes/cliente.routes.js';
import { esErrorDeTrigger, HttpError } from './utils/http-error.js';

const app = express();

app.use(express.json());

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'API LogiExpress funcionando correctamente' });
});

app.use('/api', envioRoutes);
app.use('/api', almacenRoutes);
app.use('/api', clienteRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: `Ruta ${req.method} ${req.originalUrl} no encontrada` });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ status: 'error', message: err.message });
  }
  if (esErrorDeTrigger(err)) {
    return res.status(400).json({ status: 'error', sqlState: err.sqlState, message: err.sqlMessage });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'error', message: 'JSON inválido en el body' });
  }
  if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ status: 'error', message: 'Referencia inválida (una llave foránea no existe)' });
  }
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
});

export default app;
