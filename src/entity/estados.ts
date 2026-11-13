export const ESTADOS_ENVIO = ["REGISTRADO", "EN_TRANSITO", "ENTREGADO", "CANCELADO"] as const;
export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];
