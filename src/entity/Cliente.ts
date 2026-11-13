import { Column, Entity, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { decimalTransformer } from "../utils/decimal.transformer.js";
import { Direccion } from "./Direccion.js";
import { Envio } from "./Envio.js";

export type EstadoCliente = "ACTIVO" | "INACTIVO";

@Entity("clientes")
export class Cliente {
    @PrimaryGeneratedColumn({ type: "int" })
    id!: number;

    @Column({ type: "varchar", length: 100 })
    nombre!: string;

    @Column({ type: "varchar", length: 100 })
    email!: string;

    @Column({ type: "enum", enum: ["ACTIVO", "INACTIVO"], default: "ACTIVO" })
    estado!: EstadoCliente;

    @Column({ name: "limite_credito", type: "decimal", precision: 10, scale: 2, default: 0, transformer: decimalTransformer })
    limiteCredito!: number;

    @OneToMany(() => Direccion, (direccion) => direccion.cliente)
    direcciones!: Relation<Direccion[]>;

    @OneToMany(() => Envio, (envio) => envio.cliente)
    envios!: Relation<Envio[]>;
}
