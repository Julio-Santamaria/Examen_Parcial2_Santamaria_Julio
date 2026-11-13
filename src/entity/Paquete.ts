import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { decimalTransformer } from "../utils/decimal.transformer.js";
import { Almacen } from "./Almacen.js";
import { Envio } from "./Envio.js";

@Entity("paquetes")
export class Paquete {
    @PrimaryGeneratedColumn({ type: "int" })
    id!: number;

    @ManyToOne(() => Envio, (envio) => envio.paquetes, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "envio_id" })
    envio!: Relation<Envio>;

    @ManyToOne(() => Almacen, (almacen) => almacen.paquetes, { nullable: true })
    @JoinColumn({ name: "almacen_id" })
    almacen!: Relation<Almacen> | null;

    @Column({ type: "decimal", precision: 8, scale: 2, transformer: decimalTransformer })
    peso!: number;

    @Column({ type: "varchar", length: 30 })
    dimensiones!: string;

    @Column({ type: "varchar", length: 150 })
    contenido!: string;
}
