import { access } from 'node:fs/promises';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { modelEndpoint } from '../src/model.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const setup = process.argv.includes('--setup');
const check = process.argv.includes('--check');
if (Number(process.versions.node.split('.')[0]) < 24) {
  console.error('Install Node.js 24 or newer from https://nodejs.org, then reopen your terminal.');
  process.exit(1);
}
const npmEntry = process.env.npm_execpath;
function run(args) {
  if (!npmEntry) { console.error('Start setup with npm run setup.'); process.exit(1); }
  const result = spawnSync(process.execPath, [npmEntry, ...args], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error('Could not finish npm ' + args.join(' ') + '. Check the message above.');
    process.exit(result.status || 1);
  }
}
if (setup) { run(['ci']); run(['run', 'build']); }
let missing = false;
for (const [path, message] of [['node_modules', 'Dependencies missing. Run npm run setup.'], ['dist/index.html', 'Website build missing. Run npm run setup.']]) {
  try { await access(path); } catch { console.error(message); missing = true; }
}
if (missing) process.exit(1);
let endpoint;
try { endpoint = modelEndpoint(); } catch (error) { console.error(error.message); process.exit(1); }
try {
  const health = new URL('/health', endpoint);
  const response = await fetch(health, { signal: AbortSignal.timeout(3000), redirect: 'error' });
  if (!response.ok) throw new Error();
  console.log('Local model service responds. This health check does not verify Gemma identity or inference quality.');
} catch {
  console.log('Local model is unavailable. The website still supports your own reflections and unsent suggestions.');
  console.log('For AI connections, start the Gemma runtime described in README.md. No cloud fallback or automatic model download.');
}
if (check || setup) { console.log('Website files ready. Start with npm run local.'); process.exit(0); }
const port = Number(process.env.PORT || 4178);
if (!Number.isInteger(port) || port < 1024 || port > 65535) { console.error('PORT must be an integer from 1024 to 65535.'); process.exit(1); }
const server = spawn(process.execPath, ['src/server.mjs'], { cwd: root, stdio: ['inherit', 'pipe', 'inherit'] });
server.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  if (chunk.toString().includes('Sidewalk Senate API:')) console.log('Open http://127.0.0.1:' + port + ' in your browser. Keep this terminal open; Ctrl+C stops the website.');
});
server.on('error', () => { console.error('Could not start the local website.'); process.exitCode = 1; });
server.on('exit', code => { process.exitCode = code || 0; });
process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));
