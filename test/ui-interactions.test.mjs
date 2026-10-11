import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {build} from 'vite';

// Compile the actual components; ignored output is never a product artifact.
await build({configFile:false,logLevel:'silent',build:{ssr:'web/App.tsx',outDir:'output/ui-test',emptyOutDir:true,rollupOptions:{output:{entryFileNames:'App.mjs'}}}});
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://127.0.0.1:4178/',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','Element','Event','MouseEvent','KeyboardEvent','HTMLDialogElement','navigator']){
 Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:dom.window[key]});
}
HTMLDialogElement.prototype.showModal=function(){this.open=true};
HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'))};
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
process.env.NODE_ENV='test';
const {act,createElement}=await import('react');
const {createRoot}=await import('react-dom/client');
const {default:App}=await import('../output/ui-test/App.mjs');
const cases=JSON.parse(await readFile(new URL('../data/cases.json',import.meta.url),'utf8'));
const label=cases[0].placeOptions[0].label;
const analysis={reflectionSummary:'Personal experience',connections:[],suggestion:{title:'Discussion',change:'Generated idea',rationale:'Experience',openQuestions:[]},notice:'Test interpretation'};
let root,sourceFailed=false,holdReflection,holdDraft,reflectStarted=false;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(url==='/api/cases'){
  if(sourceFailed)throw new TypeError('offline');
  return Response.json({cases});
 }
 const body=JSON.parse(options.body);
 if(url==='/api/reflect'){
  reflectStarted=true;
  if(holdReflection)await holdReflection;
  return Response.json(body.caseId?{status:'matched',analysis,source:cases[0].source}:{status:'no_match'});
 }
 if(url==='/api/draft'){
  if(holdDraft)await holdDraft;
  return Response.json({subject:body.place,body:body.observation+'\n'+body.change,notice:'Unsent'});
 }
 throw Error('Unexpected request '+url);
};
const text=()=>document.body.textContent;
const button=(name)=>[...document.querySelectorAll('button')].find(item=>item.textContent.trim().replace(/^0[1-4]/,'').replace(/\s*↗$/,'')===name);
async function click(name){const item=button(name);assert.ok(item,'Missing button '+name);await act(async()=>item.click())}
async function input(selector,value){
 const element=document.querySelector(selector);assert.ok(element,selector);
 const proto=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:element.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;
 await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(element,value);element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}))});
}
async function mount(){
 sourceFailed=false;holdReflection=undefined;holdDraft=undefined;reflectStarted=false;
 if(root)await act(async()=>root.unmount());
 root=createRoot(document.querySelector('#root'));
 await act(async()=>root.render(createElement(App)));
}
async function chooseReviewedPlace(){
 if(document.querySelector('#destination')) await act(async()=>document.querySelector('.reviewed-pin').click());
 else await input('select[id^="location-"]',cases[0].placeOptions[0].id);
}
async function fillStop(){
 await input('input[id^="place-"]','A familiar place');
 await input('textarea[id^="observation-"]','We liked being together.');
}
test('source retry retains writing and manual no-match drafting remains usable',async()=>{
 await mount();sourceFailed=true;
 // Remount under failure to exercise the actual effect and retry control.
 await act(async()=>root.unmount());root=createRoot(document.querySelector('#root'));
 await act(async()=>root.render(createElement(App)));
 assert.match(text(),/Reviewed sources are unavailable/);
 await click('I’m already back');await fillStop();
 sourceFailed=false;await click('Retry reviewed sources');
 assert.equal(document.querySelector('textarea').value,'We liked being together.');
 assert.doesNotMatch(text(),/Reviewed sources are unavailable/);
 await click('Find the connection');
 assert.match(text(),/No reviewed match/);
 // A no-match stop has neither an AI suggestion nor a proposal to agree with.
 assert.match(text(),/There’s no reviewed proposal for this place, so write your own suggestion or question\./);
 assert.doesNotMatch(text(),/Edit the AI suggestion/);

 await input('#change','My resident suggestion');
 await input('#draft-observation','');
 assert.ok(document.querySelector('#draft-observation'),'Empty textarea must stay mounted');
 assert.equal(button('Format an unsent draft').disabled,true);
 await input('#draft-observation','Replacement experience');
 await act(async()=>document.querySelector('input[type="checkbox"]').click());
 await click('Format an unsent draft');
 assert.match(text(),/Replacement experience/);
 assert.match(document.querySelector('pre').textContent,/My resident suggestion/);
});
test('reviewed map and dropdown selections agree; naming resets confirmation',async()=>{
 await mount();await click('I’m already back');
 await chooseReviewedPlace();
 await act(async()=>document.querySelector('input[type="checkbox"]').click());
 await input('input[id^="place-"]','A descriptive name');
 assert.equal(document.querySelector('input[type="checkbox"]').checked,false);
 const second=cases[0].placeOptions[1];
 await input('select[id^="location-"]',second.id);
 assert.equal(document.querySelector('input[id^="place-"]').value,second.label);
 await input('select[id^="location-"]','');
 assert.equal(document.querySelector('input[id^="place-"]').value,'');
 assert.equal(document.querySelector('input[type="checkbox"]'),null);
});
test('pending analysis locks edits and never pulls the resident back after navigation',async()=>{
 await mount();await click('I’m already back');await fillStop();await chooseReviewedPlace();
 await act(async()=>document.querySelector('input[type="checkbox"]').click());
 let finish;holdReflection=new Promise(resolve=>{finish=resolve});
 await click('Find the connection');assert.equal(reflectStarted,true);
 await click('Connection & draft');
 assert.equal(document.querySelector('#draft-observation').disabled,true);
 assert.equal(document.querySelector('#change').disabled,true);
 await act(async()=>finish());
 assert.ok(document.querySelector('#draft-observation'),'Response must not force step 2');
 await input('#change','My own words');
 await click('My outing');
 await input('textarea[id^="observation-"]','Revised experience');
 holdReflection=undefined;
 await click('Find the connection');
 assert.equal(document.querySelector('#change').value,'My own words');
});
test('preparation pin survives naming and the map disappears on departure',async()=>{
 await mount();await chooseReviewedPlace();
 await input('#destination','A friendly name');
 assert.ok(document.querySelector('.selected-pin'));
 await click('I’m heading out');
 assert.equal(document.querySelector('.place-map'),null);
 assert.match(text(),/Enjoy A friendly name/);
});

test('simulated outing returns fresh, connects a supported stop and copies an explicitly reviewed draft',async()=>{
 await mount();await input('#destination','SIMULATED: Walk with friends');await click('I’m heading out');
 assert.equal(document.querySelector('.place-map'),null);
 // Closing/reopening deliberately loses optional preparation; returning needs no stored itinerary.
 await mount();assert.equal(document.querySelector('#destination').value,'');
 await click('I’m already back');await chooseReviewedPlace();
 await input('textarea[id^="observation-"]','SIMULATED: We enjoyed walking together but felt hurried.');
 await act(async()=>document.querySelector('input[type="checkbox"]').click());
 await click('Find the connection');assert.match(text(),/A possible connection/);
 assert.match(text(),/Edit the AI suggestion or write your own/);
 await input('#change','SIMULATED RESIDENT EDIT: Could we discuss crossing together?');
 await act(async()=>document.querySelector('input[type="checkbox"]').click());await click('Format an unsent draft');
 let copied;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{copied=value}}});
 await click('Copy draft');assert.match(copied,/SIMULATED RESIDENT EDIT/);assert.match(copied,/We enjoyed walking together/);
 assert.equal([...document.querySelectorAll('[role="status"]')].filter(item=>item.textContent.includes('Draft copied')).length,1);
 await click('My outing');await click('+ Add another stop');
 const inputs=[...document.querySelectorAll('input[id^="place-"]')];
 const observations=[...document.querySelectorAll('textarea[id^="observation-"]')];
 await input('#'+inputs[0].id,'SIMULATED unreviewed cafe');await input('#'+observations[0].id,'SIMULATED: We liked talking there.');
 const connections=[...document.querySelectorAll('button')].filter(item=>item.textContent.trim().replace(/\s*↗$/,'')==='Find the connection');
 await act(async()=>connections[0].click());assert.match(text(),/No reviewed match/);
});

test('Start over keeps or clears all outing state and discards late analysis',async()=>{
 await mount();
 assert.equal(document.querySelector('nav').querySelectorAll('button').length,2);
 await input('#destination','My plans');await click('I’m already back');await fillStop();
 let finish;holdReflection=new Promise(resolve=>{finish=resolve});
 await click('Find the connection');
 await click('Start over');assert.equal(document.querySelector('dialog').open,true);
 await click('Keep this outing');assert.equal(document.querySelector('dialog').open,false);
 assert.equal(document.querySelector('textarea').value,'We liked being together.');
 await click('Start over');await click('Clear outing');
 assert.equal(document.querySelector('#destination').value,'');
 assert.equal(document.querySelector('.selected-pin'),null);
 await act(async()=>finish());
 assert.ok(document.querySelector('#destination'),'Late analysis must not leave the new outing');
 await click('I’m already back');assert.equal(document.querySelector('textarea').value,'');
 assert.equal(document.querySelectorAll('input[id^="place-"]').length,1);
});
test('Start over clears a copied draft and clipboard rejection has a manual fallback',async()=>{
 await mount();await click('I’m already back');await fillStop();await click('Find the connection');
 await input('#change','Resident words');await act(async()=>document.querySelector('input[type="checkbox"]').click());
 await click('Format an unsent draft');
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}});
 await click('Copy draft');assert.match(text(),/Clipboard is unavailable/);
 assert.equal([...document.querySelectorAll('[role="status"]')].filter(item=>item.textContent.includes('Clipboard is unavailable')).length,1);
 await click('Start over');await click('Clear outing');
 await click('Connection & draft');assert.equal(document.querySelector('pre'),null);
 assert.equal(document.querySelector('#change'),null);
});
test('Start over during draft formatting never restores an old draft',async()=>{
 await mount();await click('I’m already back');await fillStop();await click('Find the connection');
 await input('#change','Old suggestion');await act(async()=>document.querySelector('input[type="checkbox"]').click());
 let finish;holdDraft=new Promise(resolve=>{finish=resolve});await click('Format an unsent draft');
 await click('Start over');await click('Clear outing');
 await click('I’m already back');assert.equal(document.querySelector('fieldset').disabled,false);
 await act(async()=>finish());await click('Connection & draft');
 assert.equal(document.querySelector('pre'),null);assert.equal(document.querySelector('#change'),null);
});
test('pending analysis never overrides a stop selected while waiting',async()=>{
 await mount();await click('I’m already back');
 await input('input[id^="place-"]','Stop A');await input('textarea','A recollection');
 await click('+ Add another stop');await input('input[id^="place-"]','Stop B');await input('textarea','B recollection');
 await click('Stop A');let finish;holdReflection=new Promise(resolve=>{finish=resolve});
 await click('Find the connection');await click('Stop B');await act(async()=>finish());
 assert.equal(document.querySelector('main h1').textContent,'My outing');
 assert.equal(document.querySelector('input[id^="place-"]').value,'Stop B');
 assert.equal(document.querySelector('textarea').value,'B recollection');
 await click('Stop A');await click('Connection & draft');assert.match(text(),/No reviewed match/);
});
test('combined workspace announces an API failure once',async()=>{
 await mount();await click('I’m already back');await fillStop();
 const mockedFetch=globalThis.fetch;
 try {
  globalThis.fetch=async()=>{throw new TypeError('offline')};
  await click('Find the connection');await click('Connection & draft');
  assert.equal(document.querySelectorAll('[role="alert"]').length,1);
  assert.match(document.querySelector('[role="alert"]').textContent,/Your words are still here/);
 } finally {globalThis.fetch=mockedFetch;}
});
test('removing an active stop selects and focuses a remaining form; cancel preserves it',async()=>{
 await mount();await click('I’m already back');await input('input[id^="place-"]','Stop A');await input('textarea','A recollection');
 await click('+ Add another stop');await input('input[id^="place-"]','Stop B');await input('textarea','B recollection');
 const originalConfirm=window.confirm;
 try {
  window.confirm=()=>false;await click('Remove stop 2');
  assert.equal(document.querySelector('input[id^="place-"]').value,'Stop B');
  window.confirm=()=>true;await click('Remove stop 2');
  assert.equal(document.querySelector('input[id^="place-"]').value,'Stop A');
  assert.equal(document.querySelector('textarea').value,'A recollection');
  assert.equal(document.activeElement,document.querySelector('.stop-card'));
  assert.equal(document.querySelector('.stop-picker [aria-pressed="true"]').textContent,'Stop A');
  await click('+ Add another stop');await input('input[id^="place-"]','Stop C');
  await click('Stop A');await click('Remove stop 1');
  assert.equal(document.querySelector('input[id^="place-"]').value,'Stop C');
  assert.equal(document.activeElement,document.querySelector('.stop-card'));
 } finally {window.confirm=originalConfirm;}
});
test('departure can be undone through Edit my plan, Before I go, and the wordmark without clearing writing',async()=>{
 await mount();await chooseReviewedPlace();
 await input('#destination','My original plan');await click('I’m heading out');
 await click('Edit my plan');assert.ok(document.querySelector('.place-map'));
 assert.equal(document.querySelector('#destination').value,'My original plan');
 assert.ok(document.querySelector('.selected-pin'));
 assert.equal(document.activeElement,document.querySelector('#destination'));
 await click('I’m heading out');await click('Before I go');
 assert.ok(button('I’m heading out'));assert.ok(document.querySelector('.place-map'));
 await click('I’m heading out');await click('Back from your outing?');await fillStop();
 await click('Before I go');assert.ok(document.querySelector('.place-map'));
 assert.equal(document.querySelector('#destination').value,'My original plan');
 await click('I’m heading out');await act(async()=>document.querySelector('.wordmark').click());
 assert.ok(button('I’m heading out'));assert.ok(document.querySelector('.place-map'));
 await click('I’m already back');assert.equal(document.querySelector('textarea').value,'We liked being together.');
});
test('sample proposal markers are separate from resident stops and the purpose is explained',async()=>{
 await mount();assert.match(text(),/Turn an outing into a neighborhood idea/);assert.match(text(),/Local AI connects your experience/);
 const markers=[...document.querySelectorAll('.reviewed-pin')];assert.equal(markers.length,3);
 for(const marker of markers){assert.equal(marker.textContent,'P');assert.match(marker.getAttribute('aria-label'),/^Sample proposal location:/);}
 assert.match(text(),/They are not a route or your outing stops/);
 await act(async()=>markers[0].click());assert.equal(document.querySelector('#destination').value,label);
 assert.equal(document.querySelector('.selected-pin').textContent,'✓');
 await click('I’m already back');assert.match(text(),/Your outing · Stop 1/);
 assert.equal(document.querySelector('input[id^="place-"]').value,'','Preparation must not manufacture a visited stop');
 await act(async()=>document.querySelector('.reviewed-pin').click());
 assert.equal(document.querySelector('input[id^="place-"]').value,label);
 assert.equal(document.querySelector('input[type="checkbox"]').checked,false);
});
test('real local AI outing through the actual React workspaces', {skip:process.env.LOCAL_UI_REAL !== '1'}, async()=>{
 const mockedFetch=globalThis.fetch;
 globalThis.fetch=(url,options)=>originalFetch(new URL(url,'http://127.0.0.1:4178/'),options);
 try {
  await mount();await input('#destination','SIMULATED walk with friends');await click('I’m heading out');
  await click('Back from your outing?');
  await input('select[id^="location-"]',cases[0].placeOptions[0].id);
  await input('textarea[id^="observation-"]','SIMULATED: We enjoyed walking together but felt hurried near the crossing. I do not remember the waiting time.');
  await act(async()=>document.querySelector('input[type="checkbox"]').click());
  await click('Find the connection');
  const deadline=Date.now()+125000;
  while(!document.querySelector('#change') && Date.now()<deadline) await act(async()=>{await new Promise(resolve=>setTimeout(resolve,100));});
  assert.ok(document.querySelector('#change'),'Real inference should reach Connection & draft');
  assert.match(text(),/AI interpretation/);
  assert.ok(document.querySelector('a[href*="#page="]'),'Real AI connection needs a cited page');
  await input('#change','SIMULATED RESIDENT EDIT: Could we discuss crossing together?');
  await act(async()=>document.querySelector('input[type="checkbox"]').click());await click('Format an unsent draft');
  while(!document.querySelector('pre') && Date.now()<deadline) await act(async()=>{await new Promise(resolve=>setTimeout(resolve,50));});
  assert.match(document.querySelector('pre').textContent,/SIMULATED RESIDENT EDIT/);
  let copied;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{copied=value}}});
  await click('Copy draft');assert.match(copied,/I do not remember the waiting time/);
  await click('Start over');await click('Clear outing');assert.equal(document.querySelector('#destination').value,'');
 } finally {globalThis.fetch=mockedFetch;}
});
test.after(async()=>{if(root)await act(async()=>root.unmount());globalThis.fetch=originalFetch;dom.window.close()});
