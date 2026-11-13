export class HttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "HttpError";
    }
}

export function esErrorDeTrigger(err: unknown): err is { sqlState: string; sqlMessage: string } {
    return typeof err === "object" && err !== null && (err as { sqlState?: unknown }).sqlState === "45000";
}
