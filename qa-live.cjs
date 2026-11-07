const {JSDOM}=require(process.env.SOLO_JSDOM||'jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test',runScripts:'outside-only'}),w=dom.window;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
let authChange,realtime,subscription,resolveQuery,blocked=false,failure=false,queries=0;
let rows=[{id:'d1',title:'Live appointment',date:'2026-11-07',start_time:'09:00:00',end_time:'10:15:00'}];
const user={id:'user-a',email:'test@example.test'};
const client={
 auth:{onAuthStateChange:cb=>authChange=cb,getSession:async()=>({data:{session:{user}}}),signInWithPassword:async()=>({data:{session:{user}}}),signOut:async()=>({})},
 from(table){assert.equal(table,'tasks');const query={select(columns){assert.equal(columns,'id,title,date,start_time,end_time');return query},eq(column,id){assert.equal(column,'user_id');assert.equal(id,user.id);return query},order(){return query},async range(from,to){queries++;if(blocked)return await new Promise(r=>resolveQuery=r);return failure?{error:new Error('offline')}:{data:rows.slice(from,to+1)}}};return query},
 channel(){return {on(event,filter,cb){assert.equal(event,'postgres_changes');assert.equal(filter.filter,'user_id=eq.user-a');realtime=cb;return {subscribe(cb){subscription=cb;return {}}}}}},
 removeChannel(){}
};
w.supabase={createClient:()=>client};w.DAYFLOW_SUPABASE={url:'test',publishableKey:'public'};
w.eval(['gantt.js','scheduler.js','app.js','tutorial.js','dayflow-live.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n')+`\nwindow.testLive={show(){view='Schedule';scheduleDate='2026-11-07';render()},refresh:refreshDayflow,events:()=>dayflowLive.events};`);
const settle=()=>new Promise(r=>setTimeout(r,10));await settle();
w.testLive.show();
assert(w.document.querySelector('#scheduleSection').textContent.includes('Live appointment'),'initial account calendar');
rows=[{...rows[0],title:'Changed in DayFlow',start_time:'10:00:00',end_time:'11:00:00'}];realtime();await settle();
assert(w.document.querySelector('#scheduleSection').textContent.includes('Changed in DayFlow'),'remote update');
rows=[];realtime();await settle();assert(!w.document.querySelector('#scheduleSection').textContent.includes('Changed in DayFlow'),'remote deletion');
rows=[{id:'valid',title:'Valid appointment survives',date:'2026-11-07',start_time:'09:00:00',end_time:'10:00:00'},{id:'equal',title:'Same start and end',date:'2026-11-07',start_time:'10:30:00',end_time:'10:30:00'},{id:'reverse',title:'Earlier end',date:'2026-11-07',start_time:'12:00:00',end_time:'00:45:00'},{id:'late',title:'Late appointment',date:'2026-11-07',start_time:'23:40:00',end_time:'14:00:00'}];
assert.equal(await w.testLive.refresh(),true,'unusual end times must not reject calendar');assert.equal(w.testLive.events().length,4);assert.equal(w.testLive.events().find(e=>e.id==='equal').endTime,'11:30');assert.equal(w.testLive.events().find(e=>e.id==='reverse').endTime,'13:00');assert.equal(w.testLive.events().find(e=>e.id==='late').endTime,'24:00');assert(w.document.querySelector('#dayflowStatus').textContent.includes('need checking'));assert(w.document.querySelector('#scheduleSection').textContent.includes('Valid appointment survives'));assert(w.document.querySelector('#scheduleSection').textContent.includes('Check end time in DayFlow'));
rows.push({id:'bad-date',title:'Unplaceable',date:'bad-date',start_time:null,end_time:null});assert.equal(await w.testLive.refresh(),false,'unplaceable dates block automatic scheduling while valid appointments remain visible');assert.equal(w.testLive.events().length,4);
rows=Array.from({length:501},(_,i)=>({id:'page-'+i,title:'Paged item '+i,date:'2026-11-07',start_time:null,end_time:null}));assert.equal(await w.testLive.refresh(),true);assert.equal(w.testLive.events().length,501,'both calendar pages loaded');
failure=true;assert.equal(await w.testLive.refresh(),false);assert(w.document.querySelector('#dayflowStatus').textContent.includes('could not refresh'));
const before=JSON.parse(w.localStorage.getItem('solo-desk-v1')).tasks.filter(t=>t.startDate).length;
w.document.querySelector('[data-project="p1"]').click();w.document.querySelector('[data-sidebar-task]').click();w.document.querySelector('[data-drop-date="2026-11-07"][data-drop-minute="660"]').click();await settle();assert.equal(JSON.parse(w.localStorage.getItem('solo-desk-v1')).tasks.filter(t=>t.startDate).length,before,'offline cannot schedule from stale calendar');
failure=false;blocked=true;const pending=w.testLive.refresh();authChange('SIGNED_OUT',null);await settle();resolveQuery({data:[{id:'old',title:'Private old account',date:'2026-11-07',start_time:null,end_time:null}]});await pending;
assert(!w.document.querySelector('#scheduleSection').textContent.includes('Private old account'),'late response discarded after sign out');
assert(w.document.querySelector('#dayflowStatus').textContent.includes('Connect DayFlow'));
assert(!w.localStorage.getItem('solo-desk-v1').includes('Live appointment'),'live calendar not saved to project backup');
assert(queries>=5);console.log('Live calendar checks passed: updates, deletes, equal/reversed end times, midnight bounds, invalid-date isolation, pagination, offline scheduling, account isolation');w.close();
})().catch(error=>{console.error(error);process.exit(1)});

