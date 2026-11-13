import 'reflect-metadata';
import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';

const PORT = process.env.PORT || 3001;

await connectDatabase();

app.listen(PORT, (error?: Error) => {
  if (error) {
    console.error(`No se pudo iniciar el servidor en el puerto ${PORT}:`, error.message);
    process.exit(1);
  }
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
