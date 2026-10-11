import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/server.mjs';
import { analyze } from '../src/model.mjs';
import { validateAnalysis } from '../src/core.mjs';
const [project] = JSON.parse(await readFile(new URL('../data/cases.json', import.meta.url), 'utf8'));
const place = project.placeOptions[0];
const real = process.argv.includes('--real');
let calls = 0;
const app = createApp(async context => {
  calls++;
  if (real) { let result; try { result = await analyze(context); } catch (error) { console.error('Local inference validation: ' + error.message); throw error; } console.log('REAL GEMMA OUTPUT:\n' + JSON.stringify(result,null,2)); return result; }
  return validateAnalysis({
    reflectionSummary: 'SIMULATED: The visitor enjoyed spending time with friends but felt hurried near the crossing.',
    connections: [{ claimId: context.claims[0].id, explanation: 'SIMULATED MOCK AI: This dated pedestrian proposal provides a possible discussion point, not proof of current conditions.' }],
    suggestion: { title: 'A question about walking together', change: 'Could residents discuss how this crossing feels when walking together?', rationale: 'Based only on the fictional reflection.', openQuestions: ['What do other visitors experience?'] },
  }, context);
});
app.listen(0, '127.0.0.1'); await once(app, 'listening');
const base = 'http://127.0.0.1:' + app.address().port;
async function post(path, body, status = 200) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  assert.equal(response.status, status, result.error || 'Unexpected local response');
  return result;
}
try {
  console.log(real ? 'SIMULATED OUTING — fictional observations, REAL LOCAL AI. Not a real visit.' : 'SIMULATED OUTING — fictional observations, MOCK AI. Not a real visit or real inference.');
  console.log('1. At home: plan a walk with friends around Court Square. Preparation is optional, not persisted.');
  console.log('2. Outside: screen-free activity represented by this scenario; no tracking or recording.');
  const input = { place: place.label, observation: 'SIMULATED: We enjoyed walking together, but I felt hurried near the crossing. I do not remember the exact waiting time.', caseId: project.id, placeId: place.id };
  const unconfirmed = await post('/api/reflect', input);
  assert.equal(unconfirmed.status, 'needs_confirmation'); assert.equal(calls, 0);
  console.log('3. Return: unconfirmed location asks for confirmation without calling AI.');
  const matched = await post('/api/reflect', { ...input, confirmed: true });
  assert.equal(matched.status, 'matched'); assert.ok(matched.analysis); for (const connection of matched.analysis.connections) assert.ok(connection.citation.includes('#page='));
  console.log('4. Confirmed stop: dated source connection validated. Citation: ' + JSON.stringify(matched.analysis.connections.map(item => item.citation)));
  const unknown = await post('/api/reflect', { place: 'An unreviewed cafe', observation: 'SIMULATED: We enjoyed sitting and talking.' });
  assert.equal(unknown.status, 'no_match'); assert.equal(calls, 1);
  console.log('5. Second stop: no reviewed match; no borrowed proposal and no AI call.');
  const draftInput = { place: place.label, observation: input.observation, change: 'SIMULATED RESIDENT EDIT: Could we discuss making it easier to cross together without feeling hurried?' };
  await post('/api/draft', draftInput, 400);
  const draft = await post('/api/draft', { ...draftInput, reviewed: true });
  assert.ok(draft.body.includes(draftInput.change)); assert.ok(draft.body.includes(input.observation));
  console.log('6. Explicit review required. Resident wording retained in the UNSENT draft:\n' + draft.body);
  console.log('PASS: confirmation, source citation, unsupported stop, review gate and original-word preservation. Nothing deployed or sent.');
} catch (error) { console.error('Simulation failed: ' + error.message + '\nNo fallback or automatic retry. Warm the local model and inspect its output before retrying.'); process.exitCode=1; } finally { app.closeAllConnections(); await new Promise(resolve => app.close(resolve)); }
