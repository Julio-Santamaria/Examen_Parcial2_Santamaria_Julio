# LogiExpress — Sistema Logístico (MySQL 8 + API REST TypeORM)

Examen práctico de Administración de Bases de Datos.

- **Base de datos:** MySQL 8.x — 7 tablas en 3FN, 3 triggers y 2 stored procedures en [`database/logiexpress.sql`](database/logiexpress.sql).
- **API:** Node.js, Express 5, TypeScript y TypeORM, con 6 endpoints que detonan los triggers.

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # credenciales de la BD (puerto 3308, base logiexpress_db)
docker compose up -d        # MySQL 8 en el puerto 3308; ejecuta logiexpress.sql la primera vez
npm run dev                 # http://localhost:3001
```

Para volver a dejar la base como recién creada: `docker compose down -v` y luego `docker compose up -d`.
También se puede ejecutar `database/logiexpress.sql` completo en DBeaver con **Ejecutar script (Alt+X)**.

Compilar para producción:

```bash
npm run build   # src/*.ts -> dist/*.js
npm start
```

## Base de datos

Todas las tablas usan `id` como llave primaria.

| Tabla | Contenido |
|-------|-----------|
| `clientes` | Nombre, email, estado (`ACTIVO`/`INACTIVO`) y límite de crédito |
| `direcciones` | Calle, ciudad y código postal de cada cliente (FK `cliente_id`) |
| `almacenes` | Centros de distribución con `capacidad_maxima` |
| `envios` | Cliente remitente (FK), direcciones de origen y destino (FK a `direcciones`), nombre del `destinatario`, `costo_total`, `fecha`, `fecha_entrega` y `estado` (`REGISTRADO`, `EN_TRANSITO`, `ENTREGADO`, `CANCELADO`) |
| `paquetes` | Peso, dimensiones (texto, ej. `30x20x15 cm`) y contenido (FK `envio_id`, FK `almacen_id` opcional) |
| `historial_rastreo` | Bitácora: fecha, `ubicacion_actual`, `estado_evento` (mismo ENUM que el envío) y observaciones |
| `auditoria_envios` | `costo_anterior`, `costo_nuevo`, `usuario` y `fecha_modificacion` (la llena un trigger) |

### Triggers

| Trigger | Cuándo | Qué hace |
|---------|--------|----------|
| `before_insert_paquete_almacen` | `BEFORE INSERT` en `paquetes` | Si el almacén ya tiene `capacidad_maxima` paquetes, cancela el INSERT con `SIGNAL SQLSTATE '45000'` |
| `after_update_envio_costo` | `AFTER UPDATE` en `envios` | Si cambió `costo_total`, guarda OLD, NEW, usuario y fecha en `auditoria_envios`. El usuario sale de `@usuario_app` (lo envía la API) o de `USER()` si el cambio es manual |
| `after_insert_historial_rastreo` | `AFTER INSERT` en `historial_rastreo` | Si `estado_evento = 'ENTREGADO'`, pone el envío en `ENTREGADO` y guarda `fecha_entrega` |

### Stored procedures (se prueban en DBeaver o MySQL Workbench)

```sql
CALL sp_reporte_mensual_cliente(1, 10, 2026);  -- cliente, mes, año
CALL sp_obtener_hoja_ruta_envio(1);            -- envío: encabezado, paquetes e historial (3 resultados)
```

## Endpoints

Base URL: `http://localhost:3001/api`

| # | Método | Ruta | Descripción |
|---|--------|------|-------------|
| 1 | `POST` | `/envios` | Crea un envío con sus paquetes en una transacción (QueryRunner) |
| 2 | `PUT`  | `/envios/:id/costo` | Cambia el costo → trigger de auditoría |
| 3 | `POST` | `/almacenes/:id/paquetes` | Mete un paquete al almacén → trigger de capacidad (HTTP 400 si está lleno) |
| 4 | `POST` | `/envios/:id/rastreo` | Agrega un evento de rastreo → trigger de estado |
| 5 | `GET`  | `/envios` | Envíos activos (`REGISTRADO`/`EN_TRANSITO`) con clientes y paquetes (QueryBuilder) |
| 6 | `GET`  | `/clientes/:id/envios` | Historial de envíos de un cliente (`Repository.find`) |

### 1. POST /api/envios

```json
{
  "clienteId": 2,
  "direccionOrigenId": 4,
  "direccionDestinoId": 5,
  "destinatario": "Jorge Salinas",
  "costoTotal": 600,
  "paquetes": [
    { "peso": 4.5, "dimensiones": "40x30x25 cm", "contenido": "Juguetes", "almacenId": 2 },
    { "peso": 1, "dimensiones": "20x15x10 cm", "contenido": "Cables" }
  ]
}
```

- El cliente debe estar `ACTIVO`.
- Las dos direcciones (origen y destino) deben pertenecer a ese cliente.
- `almacenId` es opcional. Si algún paquete excede la capacidad del almacén, no se guarda nada (rollback) y la API responde `400`.
- También se registra el primer evento `REGISTRADO` en el historial.

### 2. PUT /api/envios/:id/costo

```json
{ "costoTotal": 675.50, "usuario": "jsupervisor" }
```

La respuesta incluye el registro que creó el trigger en `auditoria_envios`.

### 3. POST /api/almacenes/:id/paquetes

```json
{ "envioId": 3, "peso": 2, "dimensiones": "30x20x10 cm", "contenido": "Zapatos" }
```

Con los datos de ejemplo, el almacén 3 tiene capacidad 3 y ya guarda 2 paquetes: la primera petición entra y la segunda responde:

```json
HTTP 400
{ "status": "error", "sqlState": "45000", "message": "Capacidad excedida: el almacén ya no tiene espacio disponible" }
```

### 4. POST /api/envios/:id/rastreo

```json
{ "ubicacionActual": "Monterrey", "estadoEvento": "ENTREGADO", "observaciones": "Recibió el destinatario" }
```

`estadoEvento` puede ser: `REGISTRADO`, `EN_TRANSITO`, `ENTREGADO` o `CANCELADO`.
La respuesta muestra `estadoAnterior`, `estadoActual` y `fechaEntrega` del envío para ver el efecto del trigger.

### Formato de respuesta

```json
{ "status": "success", "data": { ... } }
{ "status": "error", "message": "El envío 999 no existe" }
```

Códigos: `200` OK, `201` creado, `400` datos inválidos o error `45000` de un trigger, `404` no encontrado, `500` error interno.

## Estructura

```text
src/
├── config/        # Conexión TypeORM (data-source.ts, db.ts)
├── entity/        # Cliente, Direccion, Envio, Paquete, Almacen, HistorialRastreo, AuditoriaEnvio
├── services/      # Lógica de negocio y acceso a datos (envio, almacen, cliente)
├── controllers/   # Traducen HTTP <-> servicio
├── routes/        # URL -> controlador
├── utils/         # HttpError, validaciones, transformer de DECIMAL
├── app.ts         # Express + rutas + manejo de errores
└── server.ts      # Punto de entrada
database/logiexpress.sql  # DDL + triggers + procedures + datos de ejemplo
```
