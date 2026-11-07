// Account-scoped offline cache + optimistic, three-way workspace synchronization.
const workspaceSync={user:null,cacheOwner:null,base:null,initialGuest:readWorkspaceJSON('solo-desk-v1'),startup:null,epoch:0,ready:false,running:null,timer:null,channel:null,conflict:null};
function readWorkspaceJSON(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function cloneWorkspace(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value))}
function equalWorkspace(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function emptyWorkspace(){return {projects:[],tasks:[],scratch:'',sessions:[]}}
function workspaceCacheKey(id){return 'solo-workspace:'+id}
function initialWorkspace(){const id=localStorage.getItem('solo-active-account'),cache=id&&readWorkspaceJSON(workspaceCacheKey(id));if(cache?.content){workspaceSync.cacheOwner=id;workspaceSync.base=cache.base??null;return cache.content}return localStorage.getItem('solo-legacy-owner')?emptyWorkspace():workspaceSync.initialGuest}
function storeWorkspace(content){
 if(!workspaceSync.startup)workspaceSync.startup=cloneWorkspace(content);
 const owner=workspaceSync.user?.id||workspaceSync.cacheOwner;
 localStorage.setItem(owner?workspaceCacheKey(owner):'solo-desk-v1',JSON.stringify(owner?{content,base:workspaceSync.base}:content));
 if(workspaceSync.ready&&workspaceSync.user&&!equalWorkspace(content,workspaceSync.base))queueWorkspaceSync();
}
function workspaceStatus(message){const status=document.getElementById('syncStatus');if(status)status.textContent=message;const side=document.getElementById('sidebarSyncStatus');if(side)side.textContent=message;const footer=document.getElementById('workspaceSaveStatus');if(footer)footer.textContent=message;const button=document.getElementById('accountButton');if(button)button.textContent=workspaceSync.user?'Account':'Sign in';window.refreshAndroidHome?.()}
function validWorkspace(value){
 if(!value||!Array.isArray(value.projects)||!Array.isArray(value.tasks)||!Array.isArray(value.sessions)||typeof value.scratch!=='string')return false;
 if(window.validateWorkspaceExtras&&!window.validateWorkspaceExtras(value))return false;
 const projects=new Set();for(const p of value.projects){if(!p||typeof p.id!=='string'||projects.has(p.id)||typeof p.name!=='string'||typeof p.notes!=='string'||!/^#[0-9a-f]{6}$/i.test(p.color))return false;projects.add(p.id)}
 const tasks=new Set();for(const t of value.tasks){if(!t||typeof t.id!=='string'||tasks.has(t.id)||typeof t.title!=='string'||typeof t.notes!=='string'||typeof t.project!=='string'||!Array.isArray(t.tags)||!t.tags.every(tag=>typeof tag==='string')||typeof t.done!=='boolean'||!['Today','This week','Backlog','Inbox'].includes(t.horizon)||!['High','Medium','Low'].includes(t.priority)||!taskDatesValid(t.startDate??'',t.endDate??'')||!scheduleFieldsValid(t))return false;tasks.add(t.id)}
 return value.sessions.every(s=>s&&typeof s.id==='string'&&typeof s.project==='string'&&Number.isFinite(s.minutes)&&s.minutes>=0);
}
function mergeWorkspaceValue(base,local,remote,path=''){
 if(equalWorkspace(local,remote))return cloneWorkspace(local);if(equalWorkspace(local,base))return cloneWorkspace(remote);if(equalWorkspace(remote,base))return cloneWorkspace(local);
 if((['projects','tasks','sessions','resources'].includes(path)||path.endsWith('.comments'))&&Array.isArray(local)&&Array.isArray(remote)){
  const before=new Map((base||[]).map(item=>[item.id,item])),a=new Map(local.map(item=>[item.id,item])),b=new Map(remote.map(item=>[item.id,item])),ids=[...new Set([...remote.map(x=>x.id),...local.map(x=>x.id),...before.keys()])];
  return ids.map(id=>mergeWorkspaceValue(before.get(id),a.get(id),b.get(id),path+'.'+id)).filter(item=>item!==undefined);
 }
 if(local&&remote&&typeof local==='object'&&typeof remote==='object'&&!Array.isArray(local)&&!Array.isArray(remote)){
  const merged={};for(const k of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){if(['__proto__','constructor','prototype'].includes(k))continue;const value=mergeWorkspaceValue(base?.[k],local[k],remote[k],path?path+'.'+k:k);if(value!==undefined)merged[k]=value}return merged;
 }
 throw Error('Conflicting edits: '+path);
}
function mergeInitialWorkspace(local,remote){const merged=cloneWorkspace(remote);for(const key of ['projects','tasks','sessions','resources']){if(!(key in local)&&!(key in remote))continue;const ids=new Set((remote[key]||[]).map(item=>item.id));merged[key]=[...(remote[key]||[]),...(local[key]||[]).filter(item=>!ids.has(item.id))]}if(!remote.scratch)merged.scratch=local.scratch;for(const k of Object.keys(local))if(!(k in merged)&&!['__proto__','constructor','prototype'].includes(k))merged[k]=cloneWorkspace(local[k]);return merged}
function rememberWorkspaceRecovery(local,remote){try{const id=workspaceSync.user?.id||'guest',key='solo-recovery:'+id,list=readWorkspaceJSON(key)||[];list.unshift({at:new Date().toISOString(),local:cloneWorkspace(local),cloud:cloneWorkspace(remote)});localStorage.setItem(key,JSON.stringify(list.slice(0,5)))}catch{}}
function describeWorkspace(value){return 'Projects: '+value.projects.map(p=>p.name).join(', ')+'\n'+value.tasks.map(t=>'• '+t.title+(t.done?' (complete)':'')+' | '+(t.startDate||'No dates')+' → '+(t.endDate||'')+' '+(t.startTime||'')+' '+(t.endTime||'')+(t.notes?'\n  '+t.notes:'')).join('\n')+'\nScratchpad: '+value.scratch+(window.describeWorkspaceExtras?window.describeWorkspaceExtras(value):'')}
function showWorkspaceConflict(remote){rememberWorkspaceRecovery(data,remote);document.getElementById('syncConflictDetails').textContent='THIS DEVICE\n'+describeWorkspace(data)+'\n\nCLOUD\n'+describeWorkspace(remote);workspaceSync.conflict={cloud:cloneWorkspace(remote)};workspaceStatus('Sync paused: resolve conflicting edits');const dialog=document.getElementById('syncConflictDialog');if(dialog&&!dialog.open)dialog.showModal()}
function applyWorkspaceContent(next){const note=document.getElementById('note'),oldNote=data.projects.find(p=>p.id===project)?.notes;if(document.activeElement===note&&note.value===oldNote){const nextNote=next.projects.find(p=>p.id===project)?.notes;if(typeof nextNote==='string'&&nextNote!==note.value)note.value=nextNote}data=cloneWorkspace(next);if(project&&!data.projects.some(p=>p.id===project)){project=null;projectSection='tasks'}if(document.getElementById('scratch').value!==data.scratch)document.getElementById('scratch').value=data.scratch;render()}
function queueWorkspaceSync(){if(!workspaceSync.user||!workspaceSync.ready||workspaceSync.conflict)return;clearTimeout(workspaceSync.timer);workspaceStatus('Saving…');workspaceSync.timer=setTimeout(()=>syncWorkspace(),500)}
function workspaceEditorOpen(){return !!document.querySelector('#resourcesSection:not([hidden]) #resourceForm[data-dirty="true"]')||calendarDragging||calendarPlacing||!!document.querySelector('#taskDialog[open],#projectDialog[open],#deleteProjectDialog[open],#dayflowEditorDialog[open],#calendarConfirmDialog[open]')}
async function syncWorkspace(){
 if(!workspaceSync.user||!workspaceSync.ready||workspaceSync.conflict||workspaceEditorOpen())return false;if(workspaceSync.running)return workspaceSync.running;
 const epoch=workspaceSync.epoch,user=workspaceSync.user;
 const operation=(async()=>{try{
  for(let attempt=0;attempt<6;attempt++){
   const {data:row,error}=await dayflowClient.from('pm03_workspaces').select('content,revision').eq('user_id',user.id).maybeSingle();if(error)throw error;if(epoch!==workspaceSync.epoch||workspaceEditorOpen())return false;
   if(row&&!validWorkspace(row.content))throw Error('Cloud workspace data could not be read.');
   const local=cloneWorkspace(data),remote=row?.content||emptyWorkspace();let merged;
   try{merged=workspaceSync.base?mergeWorkspaceValue(workspaceSync.base,local,remote):mergeInitialWorkspace(local,remote)}catch{showWorkspaceConflict(remote);return false}
   // An edited item on another device can refer to a project deleted here.
   const projectIds=new Set(merged.projects.map(p=>p.id));for(const t of [...merged.tasks,...(merged.resources||[])])if(t.project&&!projectIds.has(t.project))t.project='';
   if(!validWorkspace(merged))throw Error('Workspace validation failed; local changes were kept.');
   if(!row||!equalWorkspace(merged,remote)){
    const write=row?dayflowClient.from('pm03_workspaces').update({content:merged,revision:row.revision+1}).eq('user_id',user.id).eq('revision',row.revision):dayflowClient.from('pm03_workspaces').insert({user_id:user.id,content:merged,revision:1});
    const result=await write.select('revision').maybeSingle();if(epoch!==workspaceSync.epoch||workspaceEditorOpen())return false;if(result.error?.code==='23505')continue;if(result.error)throw result.error;if(!result.data)continue;
   }
   let next;try{next=mergeWorkspaceValue(local,data,merged)}catch{workspaceSync.base=cloneWorkspace(local);showWorkspaceConflict(merged);return false}
   workspaceSync.base=cloneWorkspace(merged);if(!equalWorkspace(data,next))applyWorkspaceContent(next);storeWorkspace(data);
   if(equalWorkspace(data,workspaceSync.base)){workspaceStatus('Synced across devices');return true}
  }
  workspaceStatus('Changes queued; retrying sync');return false;
 }catch(error){if(epoch===workspaceSync.epoch)workspaceStatus(navigator.onLine===false?'Offline · changes saved on this device':'Sync unavailable · changes kept on this device');return false}
 })();workspaceSync.running=operation;try{return await operation}finally{if(workspaceSync.running===operation)workspaceSync.running=null}
}
async function setWorkspaceUser(user){
 if(user?.id===workspaceSync.user?.id&&workspaceSync.ready)return;
 if(!user&&!workspaceSync.user&&!workspaceSync.cacheOwner){workspaceStatus('Local only · sign in to sync');return}
 try{storeWorkspace(data)}catch{toast('Could not save local workspace. Export a backup before switching accounts.');return}
 const epoch=++workspaceSync.epoch;workspaceSync.ready=false;clearTimeout(workspaceSync.timer);workspaceSync.running=null;workspaceSync.conflict=null;document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());if(workspaceSync.channel){dayflowClient.removeChannel(workspaceSync.channel);workspaceSync.channel=null}
 workspaceSync.user=user;
 if(!user){workspaceSync.cacheOwner=null;workspaceSync.base=null;localStorage.removeItem('solo-active-account');project=null;projectSection='tasks';document.getElementById('resetTimer').click();applyWorkspaceContent(emptyWorkspace());workspaceStatus('Signed out · account data kept on this device');return}
 const cache=readWorkspaceJSON(workspaceCacheKey(user.id));
 if(workspaceSync.cacheOwner!==user.id){
  if(cache?.content){workspaceSync.base=cache.base??null;applyWorkspaceContent(cache.content)}
  else{const legacyOwner=localStorage.getItem('solo-legacy-owner'),guest=workspaceSync.initialGuest||(!equalWorkspace(data,workspaceSync.startup)?data:null),adopt=!workspaceSync.cacheOwner&&(!legacyOwner||legacyOwner===user.id)&&guest;workspaceSync.base=null;if(adopt){rememberWorkspaceRecovery(guest,emptyWorkspace());localStorage.setItem('solo-legacy-owner',user.id)}project=null;projectSection='tasks';document.getElementById('resetTimer').click();applyWorkspaceContent(adopt?guest:emptyWorkspace())}
 }
 workspaceSync.cacheOwner=user.id;if(!localStorage.getItem('solo-legacy-owner'))localStorage.setItem('solo-legacy-owner',user.id);localStorage.setItem('solo-active-account',user.id);workspaceSync.ready=true;storeWorkspace(data);workspaceStatus('Connecting workspace…');
 workspaceSync.channel=dayflowClient.channel('pm03-workspace-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'pm03_workspaces',filter:`user_id=eq.${user.id}`},()=>syncWorkspace()).subscribe(status=>{if(epoch===workspaceSync.epoch&&status==='SUBSCRIBED')syncWorkspace()});await syncWorkspace();
}
function resolveWorkspaceConflict(useCloud){const conflict=workspaceSync.conflict;if(!conflict)return;rememberWorkspaceRecovery(data,conflict.cloud);workspaceSync.base=cloneWorkspace(conflict.cloud);if(useCloud)applyWorkspaceContent(conflict.cloud);workspaceSync.conflict=null;document.getElementById('syncConflictDialog').close();storeWorkspace(data);queueWorkspaceSync()}
document.getElementById('accountButton').onclick=()=>openDayflowAccount();
document.getElementById('syncKeepLocal').onclick=()=>resolveWorkspaceConflict(false);document.getElementById('syncKeepCloud').onclick=()=>resolveWorkspaceConflict(true);
document.getElementById('syncExportConflict').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'solo-conflict-recovery',local:data,cloud:workspaceSync.conflict?.cloud},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='solo-conflict-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
setInterval(()=>{if(document.visibilityState!=='hidden')syncWorkspace()},20000);window.addEventListener('online',()=>syncWorkspace());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncWorkspace()});
window.addEventListener('storage',event=>{if(event.key===workspaceCacheKey(workspaceSync.user?.id))syncWorkspace()});

document.addEventListener('close',event=>{if(['taskDialog','projectDialog','deleteProjectDialog','dayflowEditorDialog','calendarConfirmDialog'].includes(event.target.id))setTimeout(()=>syncWorkspace(),0)},true);

document.getElementById('syncConflictDialog').addEventListener('cancel',event=>event.preventDefault());
