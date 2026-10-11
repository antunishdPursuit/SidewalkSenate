import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reflectionContext,validateAnalysis,makeDraft } from '../src/core.mjs';
import { analyze, modelEndpoint } from '../src/model.mjs';
import { createApp } from '../src/server.mjs';
const cases = JSON.parse(await readFile(new URL('../data/cases.json',import.meta.url),'utf8'));
const input = {place:'Thomson and Jackson',caseId:'court-square-2026',placeId:'thomson-jackson',confirmed:true,observation:'We enjoyed walking together but felt crowded.'};
const context = reflectionContext(cases,input);
const output = {reflectionSummary:'You felt crowded while walking together.',connections:[{claimId:'thomson-space',explanation:'The dated proposal discusses more pedestrian space.'}],suggestion:{title:'Discuss pedestrian space',change:'Consider more room to walk together.',rationale:'My group felt crowded.',openQuestions:['What space is available?']}};
test('a ZIP alone or unknown place never becomes a source match',()=>{
 assert.equal(reflectionContext(cases,{...input,caseId:'unknown'}).status,'no_match');
 assert.equal(reflectionContext(cases,{...input,confirmed:false}).status,'needs_confirmation');
 assert.equal(reflectionContext(cases,{...input,placeId:'elsewhere'}).status,'needs_confirmation');
});
test('confirmed footprint restricts claims and produces exact page citations',()=>{
 assert.deepEqual(context.claims.map(c=>c.id),['thomson-space']);
 assert.match(validateAnalysis(output,context).connections[0].citation,/#page=17$/);
 assert.throws(()=>validateAnalysis({...output,connections:[{claimId:'pearson-crossing',explanation:'Wrong footprint'}]},context),/Unsupported/);
});
test('draft requires review and has no inferred recipient or sending action',()=>{
 assert.throws(()=>makeDraft({...input,change:'More seating'}),/Review/);
 const draft=makeDraft({...input,change:'More seating',reviewed:true});
 assert.equal(draft.recipient,null); assert.equal(draft.status,'unsent');
});
test('cloud model endpoints and redirects are not accepted',async()=>{
 assert.throws(()=>modelEndpoint('https://api.example.com/v1/chat/completions'),/local loopback/);
 assert.throws(()=>modelEndpoint('http://127.0.0.1:8187/other'),/Expected/);
 const result=await analyze(context,async(url,options)=>{
  assert.equal(url.hostname,'127.0.0.1'); assert.equal(options.redirect,'error');
  const body=JSON.parse(options.body); assert.equal(body.messages[1].role,'user');
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(output)}}]})};
 });
 assert.equal(result.reviewRequired,true);
});
test('malformed and unsupported model results fail closed',async()=>{
 await assert.rejects(analyze(context,async()=>({ok:true,json:async()=>({choices:[{message:{content:'not json'}}]})})),/valid JSON/);
 await assert.rejects(analyze(context,async()=>({ok:false,status:500})),/HTTP 500/);
});
test('HTTP golden path, no-match, malformed request and origin rejection',async(t)=>{
 const app=createApp(async()=>validateAnalysis(output,context));
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>app.close(resolve)));
 const base='http://127.0.0.1:'+app.address().port;
 const post=(path,data,extra={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(data)});
 assert.equal((await fetch(base+'/health')).status,200);
 const reflection=await post('/api/reflect',input); assert.equal(reflection.status,200);
 assert.equal((await reflection.json()).analysis.reviewRequired,true);
 assert.equal((await (await post('/api/reflect',{...input,caseId:'none'})).json()).status,'no_match');
 assert.equal((await post('/api/reflect',[])).status,400);
 assert.equal((await post('/api/reflect',input,{Origin:'https://unrelated.example'})).status,403);
 assert.equal((await post('/api/draft',{...input,reviewed:true,change:'Please discuss more pedestrian space.'})).status,200);
});

test('static asset resolution cannot escape the build directory',async()=>{
 const {readAsset}=await import('../src/static.mjs');
 assert.equal(await readAsset('/%2e%2e%2fpackage.json'),null);
 assert.equal(await readAsset('/%5c..%5cpackage.json'),null);
 assert.equal(await readAsset('/.env'),null);
 assert.equal(await readAsset('/%00.html'),null);
});

test('valid multilingual drafts fit the transport bound; oversized input remains rejected',async(t)=>{
 const app=createApp();
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>app.close(resolve)));
 const base='http://127.0.0.1:'+app.address().port;
 const post=data=>fetch(base+'/api/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 assert.equal((await post({place:'한'.repeat(200),observation:'한'.repeat(4000),change:'한'.repeat(2000),reviewed:true})).status,200);
 assert.equal((await post({place:'x'.repeat(65000),reviewed:true})).status,400);
});
test('model validation failures are service failures, not resident input errors',async(t)=>{
 const {InputError}=await import('../src/core.mjs');
 const app=createApp(async()=>{throw new InputError('Unsupported internal claim');});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>app.close(resolve)));
 const response=await fetch('http://127.0.0.1:'+app.address().port+'/api/reflect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal(response.status,503);
 const {error}=await response.json();
 assert.match(error,/verified answer/);
 assert.doesNotMatch(error,/internal claim/);
});
test('HTTP confirmation skips inference and concurrency recovers after failure',async(t)=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve});
 let calls=0;
 const app=createApp(async()=>{calls++;await pending;throw Error('offline')});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>app.close(resolve)));
 const base='http://127.0.0.1:'+app.address().port;
 const post=data=>fetch(base+'/api/reflect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 assert.equal((await (await post({...input,confirmed:false})).json()).status,'needs_confirmation');
 assert.equal(calls,0);
 const first=post(input);
 while(calls===0)await new Promise(resolve=>setImmediate(resolve));
 assert.equal((await post(input)).status,429);
 release();
 assert.equal((await first).status,503);
 assert.equal((await post(input)).status,503);
 assert.equal(calls,2);
});


test('a model rationale cannot diagnose existing street conditions',()=>{
 const result=validateAnalysis({...output,suggestion:{...output.suggestion,rationale:'Existing signal timing may not be adequate.'}},context);
 assert.equal(result.suggestion.rationale,'Based on your personal reflection, not verified street conditions or an engineering assessment.');
});

test('truncated model output fails explicitly instead of accepting a partial answer',async()=>{
 await assert.rejects(()=>analyze(context,async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{'}}]})),/output limit/);
});
