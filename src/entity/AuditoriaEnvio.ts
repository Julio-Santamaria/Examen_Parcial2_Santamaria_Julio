import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { decimalTransformer } from "../utils/decimal.transformer.js";
import { Envio } from "./Envio.js";

@Entity("auditoria_envios")
export class AuditoriaEnvio {
    @PrimaryGeneratedColumn({ type: "int" })
    id!: number;

    @ManyToOne(() => Envio, (envio) => envio.auditorias, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "envio_id" })
    envio!: Relation<Envio>;

    @Column({ name: "costo_anterior", type: "decimal", precision: 10, scale: 2, transformer: decimalTransformer })
    costoAnterior!: number;

    @Column({ name: "costo_nuevo", type: "decimal", precision: 10, scale: 2, transformer: decimalTransformer })
    costoNuevo!: number;

    @Column({ type: "varchar", length: 100 })
    usuario!: string;

    @Column({ name: "fecha_modificacion", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
    fechaModificacion!: Date;
}
