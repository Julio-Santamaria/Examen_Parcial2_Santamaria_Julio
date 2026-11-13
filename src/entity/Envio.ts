import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { decimalTransformer } from "../utils/decimal.transformer.js";
import { AuditoriaEnvio } from "./AuditoriaEnvio.js";
import { Cliente } from "./Cliente.js";
import { Direccion } from "./Direccion.js";
import { ESTADOS_ENVIO, type EstadoEnvio } from "./estados.js";
import { HistorialRastreo } from "./HistorialRastreo.js";
import { Paquete } from "./Paquete.js";

@Entity("envios")
export class Envio {
    @PrimaryGeneratedColumn({ type: "int" })
    id!: number;

    @ManyToOne(() => Cliente, (cliente) => cliente.envios, { nullable: false })
    @JoinColumn({ name: "cliente_id" })
    cliente!: Relation<Cliente>;

    @ManyToOne(() => Direccion, { nullable: false })
    @JoinColumn({ name: "direccion_origen_id" })
    direccionOrigen!: Relation<Direccion>;

    @ManyToOne(() => Direccion, { nullable: false })
    @JoinColumn({ name: "direccion_destino_id" })
    direccionDestino!: Relation<Direccion>;

    @Column({ type: "varchar", length: 100 })
    destinatario!: string;

    @Column({ name: "costo_total", type: "decimal", precision: 10, scale: 2, transformer: decimalTransformer })
    costoTotal!: number;

    @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
    fecha!: Date;

    @Column({ name: "fecha_entrega", type: "datetime", nullable: true })
    fechaEntrega!: Date | null;

    @Column({ type: "enum", enum: ESTADOS_ENVIO, default: "REGISTRADO" })
    estado!: EstadoEnvio;

    @OneToMany(() => Paquete, (paquete) => paquete.envio)
    paquetes!: Relation<Paquete[]>;

    @OneToMany(() => HistorialRastreo, (rastreo) => rastreo.envio)
    historial!: Relation<HistorialRastreo[]>;

    @OneToMany(() => AuditoriaEnvio, (auditoria) => auditoria.envio)
    auditorias!: Relation<AuditoriaEnvio[]>;
}
