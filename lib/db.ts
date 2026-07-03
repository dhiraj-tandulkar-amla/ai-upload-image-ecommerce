import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Please configure it in your .env.local file."
      );
    }
    if (connectionString.includes("[YOUR-PASSWORD]")) {
      throw new Error(
        "DATABASE_URL still contains the [YOUR-PASSWORD] placeholder. Please replace it with your actual database password in .env.local."
      );
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Needed for Supabase connections
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const dbPool = getDbPool();
  return dbPool.query(text, params);
}
