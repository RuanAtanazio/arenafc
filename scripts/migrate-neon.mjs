import fs from 'node:fs/promises';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Defina DATABASE_URL antes de executar as migrações.');
  process.exitCode = 1;
} else {
  const sql = postgres(connectionString, { max: 1, connect_timeout: 10, prepare: false });
  try {
    const migration = await fs.readFile(new URL('../drizzle-vercel/0001_init.sql', import.meta.url), 'utf8');
    for (const statement of migration.split(';').map((part) => part.trim()).filter(Boolean)) {
      await sql.unsafe(statement);
    }
    console.log('Schema PostgreSQL aplicado com sucesso.');
  } finally {
    await sql.end();
  }
}