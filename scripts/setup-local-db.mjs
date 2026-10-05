import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort();
for (const name of files) {
  console.log(`Aplicando ${name}`);
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', 'wrangler.local.json', '--file', `drizzle/${name}`], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Banco local preparado. Execute pnpm dev. Execute este preparo apenas em um banco novo.');
