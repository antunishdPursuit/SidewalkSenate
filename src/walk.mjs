import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {readFile} from 'node:fs/promises';
import {reflectionContext,makeDraft} from './core.mjs';
import {analyze} from './model.mjs';
const cases=JSON.parse(await readFile(new URL('../data/cases.json',import.meta.url),'utf8'));
const rl=createInterface({input:stdin,output:stdout});
try {
 console.log('Sidewalk Senate — reflect after your outing. Nothing is saved or sent.');
 const place=await rl.question('Where did you go? ');
 console.log('Reviewed locations (choose only if this is the place you mean):');
 cases[0].placeOptions.forEach((p,i)=>console.log((i+1)+'. '+p.label));
 console.log('0. Somewhere else / not sure');
 const selected=Number(await rl.question('Location number: '));
 const option=cases[0].placeOptions[selected-1];
 const observation=await rl.question('What did you enjoy, dislike, or wish were different? ');
 const context=reflectionContext(cases,{place,observation,caseId:option?cases[0].id:undefined,placeId:option?.id,confirmed:!!option});
 if(context.status!=='matched') {
  console.log('No reviewed proposal matches this place. Your recollection has not been changed.');
 } else {
  console.log('Considering the dated March 2026 proposal with local Gemma...');
  const result=await analyze(context);
  console.log(JSON.stringify(result,null,2));
  console.log('These are AI suggestions, not verified interpretations. Your original reflection: '+observation);
 }
 const change=await rl.question('Optional: write/edit your own suggested change (Enter to finish): ');
 if(change.trim()) {
  const confirmed=await rl.question('Have you reviewed your words and want an UNSENT draft? Type yes: ');
  if(confirmed.trim().toLowerCase()==='yes') console.log(JSON.stringify(makeDraft({place:context.place,observation,change,reviewed:true}),null,2));
 }
} catch(error) {
 console.error('Session stopped: '+error.message+' Nothing was saved or sent.');
 process.exitCode=1;
} finally {rl.close();}
