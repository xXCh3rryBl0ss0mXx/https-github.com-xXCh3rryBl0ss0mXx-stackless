import { neon } from "@neondatabase/serverless";

export type SqlQueryResult<T = Record<string, unknown>> = {
  rows: T[];
};

/** Minimal pg-style client so tests can inject a fake. */
export type SqlClient = {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<SqlQueryResult<T>>;
};

export function createNeonSqlClient(databaseUrl: string): SqlClient {
  const sql = neon(databaseUrl, { fullResults: true });
  return {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      const result = await sql.query(text, params);
      return { rows: result.rows as T[] };
    },
  };
}
