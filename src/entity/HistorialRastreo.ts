import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { Envio } from "./Envio.js";
import { ESTADOS_ENVIO, type EstadoEnvio } from "./estados.js";

@Entity("historial_rastreo")
export class HistorialRastreo {
    @PrimaryGeneratedColumn({ type: "int" })
    id!: number;

    @ManyToOne(() => Envio, (envio) => envio.historial, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "envio_id" })
    envio!: Relation<Envio>;

    @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
    fecha!: Date;

    @Column({ name: "ubicacion_actual", type: "varchar", length: 150 })
    ubicacionActual!: string;

    @Column({ name: "estado_evento", type: "enum", enum: ESTADOS_ENVIO })
    estadoEvento!: EstadoEnvio;

    @Column({ type: "varchar", length: 255, nullable: true })
    observaciones!: string | null;
}
