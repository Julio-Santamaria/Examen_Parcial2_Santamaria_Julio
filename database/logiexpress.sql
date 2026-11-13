SET NAMES utf8mb4;

DROP DATABASE IF EXISTS logiexpress_db;
CREATE DATABASE logiexpress_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE logiexpress_db;

CREATE TABLE clientes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100)  NOT NULL,
    email           VARCHAR(100)  NOT NULL,
    estado          ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    limite_credito  DECIMAL(10, 2) NOT NULL DEFAULT 0.00
) ENGINE = InnoDB;

CREATE TABLE direcciones (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id      INT          NOT NULL,
    calle           VARCHAR(150) NOT NULL,
    ciudad          VARCHAR(80)  NOT NULL,
    codigo_postal   VARCHAR(10)  NOT NULL,
    CONSTRAINT fk_direcciones_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
) ENGINE = InnoDB;

CREATE TABLE envios (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id            INT            NOT NULL,
    direccion_origen_id   INT            NOT NULL,
    direccion_destino_id  INT            NOT NULL,
    destinatario          VARCHAR(100)   NOT NULL,
    costo_total           DECIMAL(10, 2) NOT NULL,
    fecha                 DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega         DATETIME       NULL,
    estado                ENUM('REGISTRADO', 'EN_TRANSITO', 'ENTREGADO', 'CANCELADO')
                          NOT NULL DEFAULT 'REGISTRADO',
    CONSTRAINT fk_envios_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    CONSTRAINT fk_envios_dir_origen
        FOREIGN KEY (direccion_origen_id) REFERENCES direcciones (id),
    CONSTRAINT fk_envios_dir_destino
        FOREIGN KEY (direccion_destino_id) REFERENCES direcciones (id)
) ENGINE = InnoDB;

CREATE TABLE almacenes (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    nombre            VARCHAR(100) NOT NULL,
    ubicacion         VARCHAR(150) NOT NULL,
    capacidad_maxima  INT          NOT NULL
) ENGINE = InnoDB;

CREATE TABLE paquetes (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    envio_id     INT           NOT NULL,
    almacen_id   INT           NULL,
    peso         DECIMAL(8, 2) NOT NULL,
    dimensiones  VARCHAR(30)   NOT NULL,
    contenido    VARCHAR(150)  NOT NULL,
    CONSTRAINT fk_paquetes_envio
        FOREIGN KEY (envio_id) REFERENCES envios (id) ON DELETE CASCADE,
    CONSTRAINT fk_paquetes_almacen
        FOREIGN KEY (almacen_id) REFERENCES almacenes (id)
) ENGINE = InnoDB;

CREATE TABLE historial_rastreo (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    envio_id          INT          NOT NULL,
    fecha             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ubicacion_actual  VARCHAR(150) NOT NULL,
    estado_evento     ENUM('REGISTRADO', 'EN_TRANSITO', 'ENTREGADO', 'CANCELADO') NOT NULL,
    observaciones     VARCHAR(255) NULL,
    CONSTRAINT fk_rastreo_envio
        FOREIGN KEY (envio_id) REFERENCES envios (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE auditoria_envios (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    envio_id            INT            NOT NULL,
    costo_anterior      DECIMAL(10, 2) NOT NULL,
    costo_nuevo         DECIMAL(10, 2) NOT NULL,
    usuario             VARCHAR(100)   NOT NULL,
    fecha_modificacion  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_envio
        FOREIGN KEY (envio_id) REFERENCES envios (id) ON DELETE CASCADE
) ENGINE = InnoDB;

DELIMITER $$

CREATE TRIGGER before_insert_paquete_almacen
BEFORE INSERT ON paquetes
FOR EACH ROW
BEGIN
    DECLARE v_capacidad INT;
    DECLARE v_ocupados  INT;

    IF NEW.almacen_id IS NOT NULL THEN
        SELECT capacidad_maxima INTO v_capacidad
        FROM almacenes
        WHERE id = NEW.almacen_id;

        SELECT COUNT(*) INTO v_ocupados
        FROM paquetes
        WHERE almacen_id = NEW.almacen_id;

        IF v_ocupados >= v_capacidad THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Capacidad excedida: el almacén ya no tiene espacio disponible';
        END IF;
    END IF;
END$$

CREATE TRIGGER after_update_envio_costo
AFTER UPDATE ON envios
FOR EACH ROW
BEGIN
    IF OLD.costo_total <> NEW.costo_total THEN
        INSERT INTO auditoria_envios (envio_id, costo_anterior, costo_nuevo, usuario, fecha_modificacion)
        VALUES (NEW.id, OLD.costo_total, NEW.costo_total, COALESCE(@usuario_app, USER()), NOW());
    END IF;
END$$

CREATE TRIGGER after_insert_historial_rastreo
AFTER INSERT ON historial_rastreo
FOR EACH ROW
BEGIN
    IF NEW.estado_evento = 'ENTREGADO' THEN
        UPDATE envios
        SET estado = 'ENTREGADO',
            fecha_entrega = NEW.fecha
        WHERE id = NEW.envio_id;
    END IF;
END$$

CREATE PROCEDURE sp_reporte_mensual_cliente(
    IN p_cliente_id INT,
    IN p_mes        INT,
    IN p_anio       INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = p_cliente_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El cliente no existe';
    END IF;

    SELECT
        c.id                                                         AS cliente_id,
        c.nombre                                                     AS cliente,
        p_mes                                                        AS mes,
        p_anio                                                       AS anio,
        COUNT(e.id)                                                  AS total_envios,
        COALESCE(SUM(CASE WHEN e.estado <> 'CANCELADO'
                          THEN e.costo_total END), 0)                AS facturacion_total,
        COALESCE(SUM(e.estado = 'ENTREGADO'), 0)                     AS envios_entregados,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, e.fecha, e.fecha_entrega)) / 60, 2)
                                                                     AS tiempo_promedio_entrega_horas
    FROM clientes c
    LEFT JOIN envios e
           ON e.cliente_id = c.id
          AND MONTH(e.fecha) = p_mes
          AND YEAR(e.fecha)  = p_anio
    WHERE c.id = p_cliente_id
    GROUP BY c.id, c.nombre;
END$$

CREATE PROCEDURE sp_obtener_hoja_ruta_envio(
    IN p_envio_id INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM envios WHERE id = p_envio_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El envío no existe';
    END IF;

    SELECT
        e.id                                                  AS envio_id,
        e.estado,
        e.fecha,
        e.fecha_entrega,
        e.costo_total,
        c.nombre                                              AS remitente,
        CONCAT(o.calle, ', ', o.ciudad, ', C.P. ', o.codigo_postal) AS direccion_origen,
        e.destinatario,
        CONCAT(d.calle, ', ', d.ciudad, ', C.P. ', d.codigo_postal) AS direccion_destino
    FROM envios e
    JOIN clientes    c ON c.id = e.cliente_id
    JOIN direcciones o ON o.id = e.direccion_origen_id
    JOIN direcciones d ON d.id = e.direccion_destino_id
    WHERE e.id = p_envio_id;

    SELECT
        p.id                                     AS paquete_id,
        p.contenido,
        p.peso,
        p.dimensiones,
        COALESCE(a.nombre, 'Sin almacén asignado') AS almacen
    FROM paquetes p
    LEFT JOIN almacenes a ON a.id = p.almacen_id
    WHERE p.envio_id = p_envio_id
    ORDER BY p.id;

    SELECT
        h.id AS rastreo_id,
        h.fecha,
        h.ubicacion_actual,
        h.estado_evento,
        h.observaciones
    FROM historial_rastreo h
    WHERE h.envio_id = p_envio_id
    ORDER BY h.fecha ASC, h.id ASC;
END$$

DELIMITER ;

INSERT INTO clientes (nombre, email, estado, limite_credito) VALUES
    ('Ana López',           'ana.lopez@correo.com',     'ACTIVO',   50000.00),
    ('Carlos Méndez',       'carlos.mendez@correo.com', 'ACTIVO',   20000.00),
    ('Distribuidora Norte', 'compras@disnorte.com',     'ACTIVO',  100000.00),
    ('Luis Ramírez',        'luis.ramirez@correo.com',  'INACTIVO',     0.00);

INSERT INTO direcciones (cliente_id, calle, ciudad, codigo_postal) VALUES
    (1, 'Av. Juárez 120',        'Guadalajara',      '44100'),
    (1, 'Av. Constitución 300',  'Monterrey',        '64000'),
    (1, 'Calz. de Tlalpan 1500', 'Ciudad de México', '03300'),
    (2, 'Av. Universidad 80',    'Querétaro',        '76000'),
    (2, 'Calle Hidalgo 45',      'Guadalajara',      '44160'),
    (3, 'Blvd. Díaz Ordaz 900',  'Monterrey',        '64650'),
    (3, 'Av. Reforma 222',       'Ciudad de México', '06600'),
    (4, 'Calle Morelos 10',      'Puebla',           '72000');

INSERT INTO almacenes (nombre, ubicacion, capacidad_maxima) VALUES
    ('CEDIS Guadalajara',        'Periférico Sur 7000, Tlaquepaque, Jal.', 100),
    ('CEDIS Monterrey',          'Carretera a Laredo km 12, Escobedo, N.L.', 50),
    ('Bodega Express Querétaro', 'Parque Industrial Benito Juárez, Qro.',      3);

INSERT INTO envios (cliente_id, direccion_origen_id, direccion_destino_id, destinatario,
                    costo_total, fecha, estado) VALUES
    (1, 1, 2, 'Carlos Méndez',      450.00, '2026-10-05 09:00:00', 'EN_TRANSITO'),
    (1, 1, 3, 'María Torres',       780.50, '2026-10-12 10:30:00', 'EN_TRANSITO'),
    (1, 1, 2, 'Carlos Méndez',      320.00, '2026-10-20 08:00:00', 'EN_TRANSITO'),
    (3, 6, 7, 'Sucursal Reforma',  1200.00, '2026-11-02 12:00:00', 'REGISTRADO'),
    (2, 4, 5, 'Jorge Salinas',      250.00, '2026-10-25 15:00:00', 'CANCELADO');

INSERT INTO paquetes (envio_id, almacen_id, peso, dimensiones, contenido) VALUES
    (1, 1,     2.50, '30x20x15 cm', 'Ropa'),
    (1, 1,     1.20, '25x15x10 cm', 'Libros'),
    (2, 1,    10.00, '60x40x40 cm', 'Electrodoméstico pequeño'),
    (3, 3,     0.80, '20x15x5 cm',  'Documentos'),
    (4, 3,     5.00, '50x30x30 cm', 'Refacciones automotrices'),
    (4, 2,     3.30, '40x30x20 cm', 'Herramientas'),
    (5, NULL,  1.00, '20x20x20 cm', 'Accesorios');

INSERT INTO historial_rastreo (envio_id, fecha, ubicacion_actual, estado_evento, observaciones) VALUES
    (1, '2026-10-05 09:00:00', 'Guadalajara',        'REGISTRADO',  'Envío registrado en sucursal'),
    (1, '2026-10-05 18:00:00', 'CEDIS Guadalajara',  'EN_TRANSITO', 'Salida hacia Monterrey'),
    (1, '2026-10-07 11:00:00', 'Monterrey',          'ENTREGADO',   'Recibió el destinatario'),
    (2, '2026-10-12 10:30:00', 'Guadalajara',        'REGISTRADO',  NULL),
    (2, '2026-10-13 16:30:00', 'Ciudad de México',   'ENTREGADO',   'Entregado en recepción'),
    (3, '2026-10-20 08:00:00', 'Guadalajara',        'REGISTRADO',  NULL),
    (3, '2026-10-21 07:00:00', 'Querétaro',          'EN_TRANSITO', 'En Bodega Express Querétaro'),
    (4, '2026-11-02 12:00:00', 'Monterrey',          'REGISTRADO',  NULL),
    (5, '2026-10-25 15:00:00', 'Querétaro',          'CANCELADO',   'Cancelado por el cliente');

