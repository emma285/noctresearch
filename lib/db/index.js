// lib/db/index.js — Drizzle + Neon 서버리스 클라이언트.
// DATABASE_URL(.env.local/Vercel env)로 연결. Vercel 서버리스에 최적.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

const sqlClient = neon(process.env.DATABASE_URL);
export const db = drizzle(sqlClient, { schema });
export { schema };
