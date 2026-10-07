import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { InputError, reflectionContext, makeDraft } from './core.mjs';
import { analyze } from './model.mjs';
import { readAsset } from './static.mjs';
const cases = JSON.parse(await readFile(new URL('../data/cases.json',import.meta.url),'utf8'));
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new InputError('Use application/json.');
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 16000) { req.resume(); throw new InputError('Request is too large.'); } chunks.push(chunk); }
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
    return input;
  } catch { throw new InputError('Expected a JSON object.'); }
}
export function createApp(infer = analyze) {
  let active = false;
  return createServer(async (req,res) => {
    const respond = (status,body) => { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(body)); };
    const address = req.headers.host;
    if (!/^127\.0\.0\.1:\d+$/.test(address || '')) return respond(403,{error:'Local host required.'});
    if (req.headers.origin && req.headers.origin !== 'http://' + address) return respond(403,{error:'Cross-origin requests are not permitted.'});
    try {
      if (req.method === 'GET' && req.url === '/health') return respond(200,{status:'ok',inference:'not-probed',storage:'none',tracking:false});
      if (req.method === 'GET' && req.url === '/api/cases') return respond(200,{cases,coverage:'One curated project. No live search or recipient verification yet.'});
      if (req.method === 'POST' && req.url === '/api/draft') return respond(200,makeDraft(await readJson(req)));
      if (req.method === 'POST' && req.url === '/api/reflect') {
        const context = reflectionContext(cases,await readJson(req));
        if (context.status !== 'matched') return respond(200,context);
        if (active) return respond(429,{error:'One local reflection is already processing. Try again when it finishes.'});
        active = true;
        try { return respond(200,{...context,analysis:await infer(context)}); } finally { active = false; }
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        const asset = await readAsset(req.url);
        if (asset) {
          res.writeHead(200, {'Content-Type': asset.type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data: https://tile.openstreetmap.org; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});
          return res.end(req.method === 'HEAD' ? undefined : asset.body);
        }
      }
      return respond(404,{error:'Not found. Build the browser app with npm run build if the home page is missing.'});
    } catch (error) {
      if (error instanceof InputError) return respond(400,{error:error.message});
      return respond(503,{error:'Local analysis unavailable. Your reflection was not stored. Check the local model server and try again.'});
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4178);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port.');
  const app = createApp();
  app.requestTimeout = 130000;
  app.listen(port,'127.0.0.1',() => console.log('Sidewalk Senate API: http://127.0.0.1:' + port));
}
