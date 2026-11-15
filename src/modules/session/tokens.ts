import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export const newToken = () => randomBytes(TOKEN_BYTES).toString("base64url");

export const hashToken = (token: string) =>
	createHash("sha256").update(token).digest("hex");

export const bearerToken = (authorization: string | undefined) =>
	authorization?.match(/^Bearer (\S+)$/)?.[1];
