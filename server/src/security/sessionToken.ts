import { createHash, randomBytes } from "node:crypto";

export const createSessionToken = () => randomBytes(32).toString("hex");
export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");
