// Read-only connection: this app never writes to DayFlow's tasks table.
const dayflowLive={user:null,events:[],status:'Connecting to DayFlow…',generation:0,channel:null,pending:null,lastLoaded:0};
const dayflowSettings=window.DAYFLOW_SUPABASE;
const dayflowClient=window.supabase&&dayflowSettings?window.supabase.createClient(dayflowSettings.url,dayflowSettings.publishableKey):null;
function paintDayflow(){if(view==='Schedule'&&!project&&!calendarDragging)renderSchedule()}
async function refreshDayflow(){
 if(!dayflowClient||!dayflowLive.user){dayflowLive.status='Connect DayFlow to see your live calendar.';paintDayflow();return false}
 if(dayflowLive.pending)return dayflowLive.pending;
 const generation=dayflowLive.generation,user=dayflowLive.user;
 const request=(async()=>{try{
  const rows=[];let page=0;
  while(true){const {data:batch,error}=await dayflowClient.from('tasks').select('id,title,date,start_time,end_time').eq('user_id',user.id).order('id').range(page*500,page*500+499);if(error)throw error;rows.push(...batch);if(batch.length<500)break;page++}
  if(generation!==dayflowLive.generation)return false;
  const snapshot=parseDayflow({format:'dayflow-backup',tasks:rows.map(t=>({id:t.id,title:t.title,date:t.date,time:t.start_time?.slice(0,5)||null,endTime:t.end_time?.slice(0,5)||null}))});
  dayflowLive.events=snapshot.events;dayflowLive.lastLoaded=Date.now();dayflowLive.status=`DayFlow connected · ${user.email||'Signed in'} · ${snapshot.events.length} dated items · Updated ${new Date().toLocaleTimeString()}`;paintDayflow();return true;
 }catch(error){if(generation===dayflowLive.generation){dayflowLive.status='DayFlow could not refresh. Displayed items may be out of date. Check your connection and try Refresh calendar.';paintDayflow()}return false}
 })();dayflowLive.pending=request;try{return await request}finally{if(dayflowLive.pending===request)dayflowLive.pending=null}
}
function applyDayflowSession(session){
 const user=session?.user||null;if(typeof setWorkspaceUser==='function')setWorkspaceUser(user);if(user&&user.id===dayflowLive.user?.id)return;
 dayflowLive.generation++;dayflowLive.pending=null;dayflowLive.events=[];dayflowLive.lastLoaded=0;
 if(dayflowLive.channel){dayflowClient.removeChannel(dayflowLive.channel);dayflowLive.channel=null}
 dayflowLive.user=user;dayflowLive.status=user?'Loading DayFlow calendar…':'Connect DayFlow to see your live calendar.';paintDayflow();
 if(!user)return;
 const generation=dayflowLive.generation;
 dayflowLive.channel=dayflowClient.channel('pm03-dayflow-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'tasks',filter:`user_id=eq.${user.id}`},()=>refreshDayflow()).subscribe(status=>{if(generation!==dayflowLive.generation)return;if(status==='SUBSCRIBED')refreshDayflow();else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){dayflowLive.status='DayFlow live connection interrupted. Retrying automatically; calendar also refreshes every 30 seconds.';paintDayflow()}});
 refreshDayflow();
}
function openDayflowAccount(){
 if(dayflowLive.user){$('#dayflowLoginError').textContent='Connected as '+(dayflowLive.user.email||'DayFlow user')+'. Your workspace syncs with this account.';$('#dayflowCredentials').hidden=true;$('#dayflowSubmit').hidden=true;$('#dayflowSignOut').hidden=false}else{$('#dayflowLoginError').textContent=dayflowClient?'':'DayFlow connection could not start. Reload the page.';$('#dayflowCredentials').hidden=false;$('#dayflowSubmit').hidden=false;$('#dayflowSignOut').hidden=true}$('#dayflowPassword').value='';$('#dayflowDialog').showModal();
}
// Auth callbacks defer database calls to avoid holding the auth client's lock.
if(dayflowClient){dayflowClient.auth.onAuthStateChange((_event,session)=>setTimeout(()=>applyDayflowSession(session),0));dayflowClient.auth.getSession().then(({data,error})=>{if(error){dayflowLive.status='Could not restore DayFlow sign-in. Please connect again.';paintDayflow()}else applyDayflowSession(data.session)}).catch(()=>{dayflowLive.status='Could not connect to DayFlow. Please reload.';paintDayflow()})}else{dayflowLive.status='DayFlow connection could not start. Reload the page.';paintDayflow()}
$('#dayflowClose').onclick=()=>$('#dayflowDialog').close();
$('#dayflowLogin').onsubmit=async e=>{e.preventDefault();if(!dayflowClient)return;$('#dayflowSubmit').disabled=true;$('#dayflowLoginError').textContent='Signing in…';try{const {data:result,error}=await dayflowClient.auth.signInWithPassword({email:$('#dayflowEmail').value.trim(),password:$('#dayflowPassword').value});if(error)throw error;applyDayflowSession(result.session);$('#dayflowDialog').close()}catch(error){$('#dayflowLoginError').textContent=error.message||'Could not sign in.'}finally{$('#dayflowPassword').value='';$('#dayflowSubmit').disabled=false}};
$('#dayflowSignOut').onclick=async()=>{const {error}=await dayflowClient.auth.signOut({scope:'local'});if(error){$('#dayflowLoginError').textContent=error.message;return}applyDayflowSession(null);$('#dayflowDialog').close()};
setInterval(()=>{if(dayflowLive.user&&document.visibilityState!=='hidden')refreshDayflow()},30000);
window.addEventListener('online',()=>refreshDayflow());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshDayflow()});
