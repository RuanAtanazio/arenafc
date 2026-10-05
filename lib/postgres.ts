import postgres from 'postgres';

type BoundStatement = { text: string; values: unknown[] };
type Statement = {
  text: string;
  values: unknown[];
  bind: (...values: unknown[]) => Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run: () => Promise<{ success: true }>;
};

export const postgresClient = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não está configurada.');
  const root = globalThis as typeof globalThis & { arenaPostgres?: ReturnType<typeof postgres> };
  root.arenaPostgres ??= postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false });
  return root.arenaPostgres;
};

function postgresPlaceholders(text: string) {
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
}

function normalizeRow(row: Record<string, unknown> | undefined) {
  if (!row) return null;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    key.endsWith('_at') || key.endsWith('At') ? Number(value) : value,
  ]));
}

export function db() {
  const prepare = (text: string, values: unknown[] = []): Statement => ({
    text,
    values,
    bind: (...nextValues) => prepare(text, nextValues),
    first: async <T = Record<string, unknown>>() => normalizeRow((await postgresClient().unsafe(postgresPlaceholders(text), values as never[]))[0]) as T | null,
    all: async <T = unknown>() => ({ results: (await postgresClient().unsafe(postgresPlaceholders(text), values as never[])).map((row) => normalizeRow(row) as T) }),
    run: async () => {
      await postgresClient().unsafe(postgresPlaceholders(text), values as never[]);
      return { success: true };
    },
  });

  return {
    prepare,
    batch: async (statements: BoundStatement[]) => postgresClient().begin(async (transaction) => {
      const results = [];
      for (const statement of statements) {
        results.push(await transaction.unsafe(postgresPlaceholders(statement.text), statement.values as never[]));
      }
      return results;
    }),
  };
}