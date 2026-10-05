import { drizzle } from "drizzle-orm/postgres-js";
import { postgresClient } from "@/lib/postgres";
import * as schema from "./schema";

export function getDb() {
  return drizzle(postgresClient(), { schema });
}
