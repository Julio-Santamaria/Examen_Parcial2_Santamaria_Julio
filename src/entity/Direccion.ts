import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { Cliente } from "./Cliente.js";

@Entity("direcciones")
export class Direccion {
    @PrimaryGeneratedColumn({ type: "int" })
    id!: number;

    @ManyToOne(() => Cliente, (cliente) => cliente.direcciones, { nullable: false })
    @JoinColumn({ name: "cliente_id" })
    cliente!: Relation<Cliente>;

    @Column({ type: "varchar", length: 150 })
    calle!: string;

    @Column({ type: "varchar", length: 80 })
    ciudad!: string;

    @Column({ name: "codigo_postal", type: "varchar", length: 10 })
    codigoPostal!: string;
}
