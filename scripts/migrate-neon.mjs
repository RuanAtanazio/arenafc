import fs from 'node:fs/promises';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Defina DATABASE_URL antes de executar as migrações.');
  process.exitCode = 1;
} else {
  const sql = postgres(connectionString, { max: 1, connect_timeout: 10, prepare: false });
  try {
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at BIGINT NOT NULL
    )`;

    const directory = new URL('../drizzle-vercel/', import.meta.url);
    const files = (await fs.readdir(directory)).filter((file) => /^\d+_.*\.sql$/.test(file)).sort();
    for (const file of files) {
      const version = file.slice(0, file.indexOf('_'));
      const alreadyApplied = await sql`SELECT version FROM schema_migrations WHERE version = ${version}`;
      if (alreadyApplied.length) continue;

      const migration = await fs.readFile(new URL(file, directory), 'utf8');
      await sql.begin(async (transaction) => {
        for (const statement of migration.split(';').map((part) => part.trim()).filter(Boolean)) {
          await transaction.unsafe(statement);
        }
        await transaction`INSERT INTO schema_migrations (version, applied_at) VALUES (${version}, ${Date.now()})`;
      });
      console.log(`Migração ${file} aplicada.`);
    }
    console.log('Migrações PostgreSQL concluídas; dados existentes foram preservados.');
  } finally {
    await sql.end();
  }
}