import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {build} from 'vite';

// Compile the actual components; ignored output is never a product artifact.
await build({configFile:false,logLevel:'silent',build:{ssr:'web/App.tsx',outDir:'output/ui-test',emptyOutDir:true,rollupOptions:{output:{entryFileNames:'App.mjs'}}}});
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://127.0.0.1:4178/',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','Element','Event','MouseEvent','KeyboardEvent','navigator']){
 Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:dom.window[key]});
}
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
 await click('Shape my suggestion');
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
 await click('1. '+label);
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
 await mount();await click('I’m already back');await fillStop();await click('1. '+label);
 await act(async()=>document.querySelector('input[type="checkbox"]').click());
 let finish;holdReflection=new Promise(resolve=>{finish=resolve});
 await click('Find the connection');assert.equal(reflectStarted,true);
 await click('Shape your suggestion');
 assert.equal(document.querySelector('#draft-observation').disabled,true);
 assert.equal(document.querySelector('#change').disabled,true);
 await act(async()=>finish());
 assert.ok(document.querySelector('#draft-observation'),'Response must not force step 2');
 await input('#change','My own words');
 await click('Back from your outing');
 await input('textarea[id^="observation-"]','Revised experience');
 holdReflection=undefined;
 await click('Find the connection');await click('Shape my suggestion');
 assert.equal(document.querySelector('#change').value,'My own words');
});
test('preparation pin survives naming and the map disappears on departure',async()=>{
 await mount();await click('1. '+label);
 await input('#destination','A friendly name');
 assert.ok(document.querySelector('.selected-pin'));
 await click('I’m heading out');
 assert.equal(document.querySelector('.place-map'),null);
 assert.match(text(),/Enjoy A friendly name/);
});
test.after(async()=>{if(root)await act(async()=>root.unmount());globalThis.fetch=originalFetch;dom.window.close()});
