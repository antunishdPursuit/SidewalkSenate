import {useEffect,useRef,useState} from 'react';

type Place = {id:string;label:string};
type Source = {url:string;title:string;documentDate:string;status:string};
type Case = {id:string;title:string;placeOptions:Place[];source:Source};
type Analysis = {reflectionSummary:string;connections:{claimId:string;explanation:string;sourceClaim:string;citation:string}[];suggestion:{title:string;change:string;rationale:string;openQuestions:string[]};notice:string};
type Draft = {subject:string;body:string;notice:string};
type Stop = {id:string;place:string;observation:string;placeId:string;confirmed:boolean;analysis?:Analysis;source?:Source;outcome?:string;error?:string;busy:boolean;change:string;reviewed:boolean;draft?:Draft};
const steps=['Before you go','Back from your outing','Explore the connection','Shape your suggestion'];
const freshStop=():Stop=>({id:crypto.randomUUID(),place:'',observation:'',placeId:'',confirmed:false,busy:false,change:'',reviewed:false});
async function api(path:string,body?:unknown){
 const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(130000)});
 const data=await response.json();
 if(!response.ok) throw new Error(data.error||'Something went wrong. Your words are still here.');
 return data;
}
function Arrow(){return <span aria-hidden="true">↗</span>}
export default function App(){
 const [step,setStep]=useState(0);
 const previousStep=useRef(0);
 useEffect(()=>{if(previousStep.current!==step){document.getElementById('main')?.focus({preventScroll:true});previousStep.current=step}},[step]);
 const [destination,setDestination]=useState('');
 const [headingOut,setHeadingOut]=useState(false);
 const [stops,setStops]=useState<Stop[]>(()=>[freshStop()]);
 const [active,setActive]=useState<string>('');
 const [cases,setCases]=useState<Case[]>([]);
 const [sourceError,setSourceError]=useState('');
 const [sourceLoading,setSourceLoading]=useState(true);
 const [notice,setNotice]=useState('');
 const [draftBusy,setDraftBusy]=useState(false);
 const busy=stops.some(stop=>stop.busy)||draftBusy;
 const dirty=!!destination.trim()||stops.some(stop=>stop.place.trim()||stop.observation.trim()||stop.change.trim());
 const current=stops.find(stop=>stop.id===active)||stops[0];
 const project=cases[0];
 useEffect(()=>{
  let live=true;
  api('cases').then(data=>{if(live)setCases(data.cases)}).catch(()=>{if(live)setSourceError('Reviewed sources are unavailable. You can still write your reflection; try reloading when the local app is available.')}).finally(()=>{if(live)setSourceLoading(false)});
  return()=>{live=false};
 },[]);
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 function patch(id:string,changes:Partial<Stop>,invalidate=false){
  setStops(items=>items.map(stop=>stop.id!==id?stop:{...stop,...(invalidate?{analysis:undefined,source:undefined,outcome:undefined,error:undefined,draft:undefined,reviewed:false}:{}),...changes}));
 }
 function move(index:number){setStep(index);setNotice('')}
 function reset(){
  if(dirty&&!window.confirm('Clear this outing? Your reflections and drafts are not saved.'))return;
  const first=freshStop();setStops([first]);setActive(first.id);setDestination('');setHeadingOut(false);setNotice('');setStep(0);
 }
 async function connect(stop:Stop){
  if(!stop.place.trim()||!stop.observation.trim()){setNotice('Add a place and a reflection first. A few words are enough.');return}
  if(stop.placeId&&!stop.confirmed){setNotice('Confirm the street location, or choose somewhere else / not sure.');return}
  setNotice('');patch(stop.id,{busy:true,error:undefined});
  try{
   const result=await api('reflect',{place:stop.place,observation:stop.observation,caseId:stop.placeId?project?.id:undefined,placeId:stop.placeId,confirmed:stop.confirmed});
   patch(stop.id,{analysis:result.analysis,source:result.source,outcome:result.status,change:result.analysis?.suggestion.change||stop.change,reviewed:false,draft:undefined});
   setActive(stop.id);setStep(2);
  }catch(error){patch(stop.id,{error:error instanceof Error?error.message:'Local analysis is unavailable. Your words are still here.'})}
  finally{patch(stop.id,{busy:false})}
 }
 async function formatDraft(stop:Stop){
  setDraftBusy(true);setNotice('');
  try{
   const result=await api('draft',{place:stop.place,observation:stop.observation,change:stop.change,reviewed:stop.reviewed});
   patch(stop.id,{draft:result});
  }catch(error){setNotice(error instanceof Error?error.message:'Draft unavailable. Your words are still here.')}
  finally{setDraftBusy(false)}
 }
 async function copyDraft(draft:Draft){
  try{await navigator.clipboard.writeText('Subject: '+draft.subject+'\n\n'+draft.body);setNotice('Draft copied. Nothing has been sent.')}
  catch{setNotice('Clipboard is unavailable. Select and copy the draft text below.')}
 }
 return <div className="app">
  <a className="skip-link" href="#main">Skip to content</a>
  <header className="topbar">
   <a className="wordmark" href="#main" onClick={()=>move(0)}><span className="mark" aria-hidden="true">ss</span><span>Sidewalk Senate</span></a>
   <div className="header-actions"><span className="local-label"><span aria-hidden="true">●</span> Your local notebook</span><button className="text-button" onClick={reset} disabled={busy}>New outing</button></div>
  </header>
  <nav aria-label="Outing steps" className="steps">{steps.map((label,index)=><button key={label} className={step===index?'step current':'step'} aria-current={step===index?'step':undefined} onClick={()=>move(index)}><span className="step-number" aria-hidden="true">0{index+1}</span>{label}</button>)}</nav>
  <main id="main" tabIndex={-1}>
   <div className="page-heading"><p className="eyebrow">A neighborhood notebook · Queens, NYC</p><h1>{step===0?'Your neighborhood,\nin your own words.':step===1?'What stayed with you?':step===2?'A thought meets a plan.':'A small idea for your neighborhood.'}</h1><p className="intro">{step===0?'Go somewhere you already want to go. Come back with a thought about the place. We’ll help you find where that thought belongs.':step===1?'Tell us what you remember, not what you think you were supposed to notice. One memorable stop is enough.':step===2?'Your experience comes first. A documented proposal adds context; it doesn’t tell you how to feel.':'Keep your own voice. An idea can begin with a feeling, without pretending to be a finished design.'}</p></div>
   <div role="status" aria-live="polite" className={notice?'notice':'status-empty'}>{notice}</div>
   {sourceError&&<p role="alert" className="error">{sourceError}</p>}
   {step===0&&<div className="two-column">
    <section className="panel notebook"><p className="eyebrow">01 / A loose plan</p><h2>Where are you headed?</h2><label htmlFor="destination">A place, a familiar corner, a plan with friends</label><input id="destination" value={destination} maxLength={200} onChange={event=>setDestination(event.target.value)} placeholder="A café in Long Island City, then wherever we feel like…"/>
     {!headingOut?<><p className="helper">No route to reconstruct. No checklist to carry.</p><div className="button-row"><button className="primary" onClick={()=>setHeadingOut(true)}>I’m heading out <Arrow/></button><button className="secondary" onClick={()=>move(1)}>I’m already back</button></div></>:<div className="outdoor-note" role="status"><h3>That’s enough screen time.</h3><p>{destination.trim()?'Enjoy '+destination.trim()+'.':'Enjoy your plans.'} Walk, talk, stop somewhere unexpected. There’s nothing you need to record.</p><button className="secondary" onClick={()=>move(1)}>Back from your outing?</button></div>}
    </section>
    <aside className="margin-note"><span className="hand-note">A place is more than a pin.</span><p>The conversation can wait until you’re home. What felt welcoming? What made you leave? What would make you return?</p><div className="coverage-note"><p className="eyebrow">Our first few pages</p><strong>Court Square, Long Island City</strong><p>This prototype knows one dated pedestrian-improvement project. Other places are welcome; we’ll be honest when we don’t have a matching proposal.</p>{project&&<a href={project.source.url} target="_blank" rel="noreferrer">View the March 2026 source <Arrow/></a>}</div></aside>
   </div>}
   {step===1&&<div className="reflection-layout"><section aria-label="Your stops" className="stop-list">{stops.map((stop,index)=><article className="panel stop-card" key={stop.id}><div className="section-top"><p className="eyebrow">Stop {String(index+1).padStart(2,'0')}</p>{stops.length>1&&<button className="text-button" disabled={stop.busy||draftBusy} onClick={()=>{if((stop.observation||stop.change)&&!window.confirm('Remove this stop and its unsaved reflection?'))return;setStops(items=>items.filter(item=>item.id!==stop.id))}}>Remove stop {index+1}</button>}</div>
     <fieldset disabled={stop.busy}><legend className="sr-only">Stop {index+1} reflection</legend>
      <label htmlFor={'place-'+stop.id}>Where did you spend time?</label><input id={'place-'+stop.id} value={stop.place} maxLength={200} onChange={event=>patch(stop.id,{place:event.target.value},true)} placeholder="A street, plaza, park, or landmark"/>
      <label htmlFor={'observation-'+stop.id}>What did it feel like to be there?</label><textarea id={'observation-'+stop.id} value={stop.observation} maxLength={4000} rows={5} onChange={event=>patch(stop.id,{observation:event.target.value},true)} placeholder="We stayed longer than we expected. There was room to sit together, but…"/><p className="helper">Enjoyment, discomfort, a wish, or “I don’t remember.” Your words are enough.</p>
      <label htmlFor={'location-'+stop.id}>Is this one of our reviewed locations?</label><select id={'location-'+stop.id} disabled={sourceLoading||!project} value={stop.placeId} onChange={event=>patch(stop.id,{placeId:event.target.value,confirmed:false},true)}><option value="">Somewhere else / not sure</option>{project?.placeOptions.map(place=><option key={place.id} value={place.id}>{place.label}</option>)}</select>
      {stop.placeId&&<label className="checkbox-label"><input type="checkbox" checked={stop.confirmed} onChange={event=>patch(stop.id,{confirmed:event.target.checked},true)}/><span>I recognize this as the location I mean. This does not confirm where every observation happened.</span></label>}
     </fieldset>
     {stop.error&&<p role="alert" className="error">{stop.error} Your original words remain above.</p>}
     <button className="primary" disabled={busy||sourceLoading} onClick={()=>connect(stop)}>{stop.busy?'Considering your reflection…':'Find the connection'} {!stop.busy&&<Arrow/>}</button>
    </article>)}<button className="secondary add-stop" disabled={busy||stops.length>=6} onClick={()=>setStops(items=>[...items,freshStop()])}>+ Add another stop</button></section>
    <aside className="margin-note"><span className="hand-note">You don’t need to remember every street.</span><p>Start with the place you recognize and the feeling that stayed with you. A nearby proposal isn’t automatically the right one.</p><p>Nothing here is saved after you close or reload this page. Keep a copy of any draft you want to retain.</p></aside>
   </div>}
   {(step===2||step===3)&&<><div className="stop-picker" aria-label="Choose a stop">{stops.map((stop,index)=><button className={current.id===stop.id?'secondary selected':'secondary'} key={stop.id} onClick={()=>{setActive(stop.id);setNotice('')}} aria-pressed={current.id===stop.id}>{stop.place||'Stop '+(index+1)}</button>)}</div>
    {step===2&&<div className="two-column"><div className="stack">
     <section className="panel"><p className="eyebrow">Your experience</p><h2>{current.place||'Start with a place'}</h2>{current.observation?<blockquote>{current.observation}</blockquote>:<p>You haven’t added a reflection for this stop yet.</p>}<button className="text-button" onClick={()=>move(1)}>Edit your original reflection</button></section>
     {current.analysis?<section className="panel"><p className="eyebrow">AI interpretation · Review required</p><h2>A possible connection</h2><p>{current.analysis.reflectionSummary}</p>{current.analysis.connections.length?current.analysis.connections.map(connection=><div className="connection" key={connection.claimId}><p>{connection.explanation}</p><p className="source-fact"><strong>Documented proposal:</strong> {connection.sourceClaim}</p><a href={connection.citation} target="_blank" rel="noreferrer">Read the cited page <Arrow/></a></div>):<p>The model found no supported connection to this proposal. That does not make your experience less useful.</p>}<p className="helper">{current.analysis.notice}</p></section>:<section className="panel"><p className="eyebrow">{current.outcome==='no_match'?'No reviewed match':'No connection yet'}</p><h2>{current.outcome==='no_match'?'Your thought still belongs here.':'Let’s start with your words.'}</h2><p>{current.outcome==='no_match'?'We don’t have a reviewed proposal for this place. You can still write a resident suggestion; we won’t borrow a nearby project to make a match.':'Add a reflection and confirm a supported location, or choose somewhere else / not sure.'}</p>{!current.outcome&&<button className="secondary" onClick={()=>move(1)}>Add a reflection</button>}</section>}
     <button className="primary" disabled={!current.place.trim()||!current.observation.trim()} onClick={()=>move(3)}>Shape my suggestion <Arrow/></button>
    </div><aside className="margin-note">{current.source?<><p className="eyebrow">The dated record</p><h2>What was proposed?</h2><strong>{current.source.title}</strong><p>{current.source.status}</p><a href={current.source.url} target="_blank" rel="noreferrer">Open the official document <Arrow/></a><p className="helper">A proposal is not proof of today’s conditions, an open comment period, or completed construction.</p></>:<><span className="hand-note">No match is an honest answer.</span><p>Live internet discovery is not connected yet. This first notebook contains one reviewed project.</p></>}</aside></div>}
    {step===3&&<div className="two-column"><section className="panel"><p className="eyebrow">Your suggestion · Unsent</p><h2>What would you like to change?</h2>{!current.place.trim()||!current.observation.trim()?<><p>Add a place and your experience before drafting a suggestion.</p><button className="secondary" onClick={()=>move(1)}>Back to my reflection</button></>:<><p className="helper">For {current.place}. Edit the AI suggestion or write your own. You don’t have to agree with the proposal.</p><label htmlFor="draft-observation">Your experience, in your words</label><textarea id="draft-observation" value={current.observation} rows={4} maxLength={4000} onChange={event=>patch(current.id,{observation:event.target.value},true)}/><label htmlFor="change">Your suggested change or question</label><textarea id="change" rows={5} value={current.change} maxLength={2000} onChange={event=>patch(current.id,{change:event.target.value,reviewed:false,draft:undefined})} placeholder="I would like to discuss…"/><label className="checkbox-label"><input type="checkbox" checked={current.reviewed} onChange={event=>patch(current.id,{reviewed:event.target.checked,draft:undefined})}/><span>I’ve reviewed these words. They represent my own experience and suggestion.</span></label><button className="primary" disabled={!current.reviewed||!current.change.trim()||draftBusy} onClick={()=>formatDraft(current)}>{draftBusy?'Formatting…':'Format an unsent draft'} {!draftBusy&&<Arrow/>}</button></>}
      {current.draft&&<div className="draft"><h3>{current.draft.subject}</h3><pre tabIndex={0} aria-label="Unsent draft text">{current.draft.body}</pre><p className="helper">{current.draft.notice}</p><button className="secondary" onClick={()=>copyDraft(current.draft!)}>Copy draft</button></div>}
     </section><aside className="margin-note"><span className="hand-note">A suggestion, not a finished blueprint.</span><p>Your experience can start a conversation. It doesn’t need to stand in for every neighbor’s opinion.</p>{current.analysis?.suggestion.openQuestions.length?<><h3>Questions worth keeping open</h3><ul>{current.analysis.suggestion.openQuestions.map(question=><li key={question}>{question}</li>)}</ul></>:null}<div className="coverage-note"><strong>Where does it go next?</strong><p>We haven’t verified a recipient or feedback channel yet. This prototype drafts only; it never sends anything.</p></div></aside></div>}
   </>}
  </main>
  <footer><span>Less time on a screen. More life around you.</span><span>Local prototype · No tracking · No automatic sending</span></footer>
 </div>
}
