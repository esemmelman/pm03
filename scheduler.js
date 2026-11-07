const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let scheduleDate=localDate(),scheduleMode='week',allDayExpanded=false;
const minuteOf=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'')?Number(t.slice(0,2))*60+Number(t.slice(3)):NaN;
const calendarStartMinute=5*60,calendarEndMinute=23*60;
const calendarClock=m=>{const minutes=((m%1440)+1440)%1440,hour=Math.floor(minutes/60);return `${hour%12||12}:${String(minutes%60).padStart(2,'0')} ${hour<12?'AM':'PM'}`};
const clockOf=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
function scheduleFieldsValid(t){const a=t.startTime||'',b=t.endTime||'';return (t.durationMinutes===undefined||Number.isInteger(t.durationMinutes)&&t.durationMinutes>0&&t.durationMinutes<=1440)&&(!a&&!b||Number.isFinite(minuteOf(a))&&Number.isFinite(minuteOf(b))&&minuteOf(a)<minuteOf(b)&&!!t.startDate&&t.startDate===t.endDate)}
function validateScheduleInputs(){const t={startTime:$('#taskTime').value,endTime:$('#taskEndTime').value,startDate:$('#taskStart').value,endDate:$('#taskEnd').value,durationMinutes:Number($('#taskDuration').value)};if(scheduleFieldsValid(t))return true;toast('Use both times, with end after start, on a single date. Estimate must be 1–1440 minutes.');return false}
const dayflowEndMinute=t=>t==='24:00'?1440:minuteOf(t);
function validDayflowSnapshot(s){return s&&typeof s.importedAt==='string'&&Array.isArray(s.events)&&s.events.every(e=>typeof e.id==='string'&&typeof e.title==='string'&&Number.isFinite(dateDay(e.date))&&(!e.time&&!e.endTime||Number.isFinite(minuteOf(e.time))&&Number.isFinite(dayflowEndMinute(e.endTime))&&dayflowEndMinute(e.endTime)>minuteOf(e.time)))}
function parseDayflow(raw){
 if(raw?.format!=='dayflow-backup'||!Array.isArray(raw.tasks))throw Error('Choose a DayFlow JSON backup.');
 const events=[];let adjustedCount=0,skippedCount=0;
 for(const t of raw.tasks){
  if(!t||typeof t.title!=='string'||t.id==null){skippedCount++;continue}if(!t.date)continue;
  const parts=String(t.date).split('-'),date=parts.map((v,i)=>String(v).padStart(i===0?4:2,'0')).join('-');
  if(parts.length!==3||!Number.isFinite(dateDay(date))){skippedCount++;continue}
  const time=t.time==null?'':String(t.time);let endTime='',note='';
  if(!time){events.push({id:String(t.id),title:t.title,date,time:'',endTime:''});continue}
  const start=minuteOf(time);
  if(!Number.isFinite(start)){adjustedCount++;events.push({id:String(t.id),title:t.title,date,time:'',endTime:'',note:'Check start time in DayFlow; reserving this day.',blocksDay:true});continue}
  const end=t.endTime?dayflowEndMinute(String(t.endTime)):NaN;
  if(!Number.isFinite(end)||end<=start){const assumedEnd=Math.min(1440,start+60);endTime=clockOf(assumedEnd);if(t.endTime){adjustedCount++;note='Check end time in DayFlow; '+(assumedEnd-start===60?'1 hour reserved.':'reserved until midnight.')}}else endTime=String(t.endTime);
  events.push({id:String(t.id),title:t.title,date,time,endTime,...(note?{note}:{})});
 }
 return {importedAt:new Date().toISOString(),events,adjustedCount,skippedCount};
}
function dayEntries(date,exclude=''){return [...(typeof dayflowLive==='undefined'?data.dayflow?.events||[]:dayflowLive.events).filter(e=>e.date===date).map(e=>({...e,source:'DayFlow',start: e.time?minuteOf(e.time):0,end:e.time?dayflowEndMinute(e.endTime):1440})),...data.tasks.filter(t=>t.id!==exclude&&!t.done&&t.startDate&&t.startDate<=date&&t.endDate>=date).map(t=>({id:t.id,title:t.title,project:t.project,source:'Task',start:t.startTime?minuteOf(t.startTime):0,end:t.startTime?minuteOf(t.endTime):1440}))].sort((a,b)=>a.start-b.start||a.end-b.end)}
function firstSlot(entries,duration,start,end){let cursor=start;for(const e of entries){if(e.end<=cursor)continue;if(e.start>=cursor+duration)return cursor+duration<=end?cursor:null;cursor=Math.max(cursor,e.end);if(cursor+duration>end)return null}return cursor+duration<=end?cursor:null}
function renderSchedule(){
 const previousScroll=$('#scheduleSection .calendar-scroll'),scrollPosition=previousScroll?{top:previousScroll.scrollTop,left:previousScroll.scrollLeft}:null,days=scheduleMode==='week'?7:1;
 $('#scheduleSection').innerHTML=scheduleCalendar(days);
 $('#calendarControls').innerHTML=`<div class="sidebar-calendar-navigation"><button id="schedulePrevious" type="button" aria-label="Previous dates">←</button><button id="scheduleToday" type="button">Today</button><button id="scheduleNext" type="button" aria-label="Next dates">→</button></div><input id="scheduleDate" type="date" value="${scheduleDate}" aria-label="Calendar starting date" required><div class="sidebar-calendar-navigation"><button id="scheduleDay" type="button" aria-pressed="${scheduleMode==='day'}">Day</button><button id="scheduleWeek" type="button" aria-pressed="${scheduleMode==='week'}">7 days</button><button id="scheduleNew" type="button">+ Task</button></div><div class="sidebar-calendar-navigation"><button id="dayflowConnect" type="button">${typeof dayflowLive!=='undefined'&&dayflowLive.user?'Account':'Sign in'}</button><button id="dayflowRefresh" type="button">Refresh</button></div><details class="sidebar-calendar-status"><summary>DayFlow connection</summary><p id="dayflowStatus" role="status">${typeof dayflowLive==='undefined'?'Connect DayFlow to see its live calendar.':esc(dayflowLive.status)}</p></details>`;
 $('#scheduleDate').onchange=e=>{if(Number.isFinite(dateDay(e.target.value))){scheduleDate=e.target.value;renderSchedule()}};
 const shiftDates=step=>{scheduleDate=timelineDate(dateDay(scheduleDate)+step);renderSchedule();$('#scheduleSection .calendar-scroll').scrollLeft=0};$('#schedulePrevious').onclick=()=>shiftDates(-days);$('#scheduleNext').onclick=()=>shiftDates(days);$('#calendarNextDates').onclick=()=>shiftDates(days);$('#scheduleToday').onclick=()=>{scheduleDate=localDate();renderSchedule()};$('#scheduleDay').onclick=()=>{scheduleMode='day';renderSchedule()};$('#scheduleWeek').onclick=()=>{scheduleMode='week';renderSchedule()};$('#scheduleNew').onclick=()=>openTask();$('#dayflowConnect').onclick=()=>openDayflowAccount();$('#dayflowRefresh').onclick=()=>refreshDayflow();
 const calendarScroll=$('#scheduleSection .calendar-scroll');calendarScroll.scrollTop=scrollPosition?.top??0;calendarScroll.scrollLeft=scrollPosition?.left??0;wireCalendar();
 $('#scheduleSection').onclick=async e=>{if(e.target.closest('#allDayToggle')){allDayExpanded=!allDayExpanded;renderSchedule();$('#allDayToggle').focus({preventScroll:true});return}const slot=e.target.closest('[data-drop-date]'),edit=e.target.closest('[data-schedule-edit]'),appointment=e.target.closest('[data-dayflow-edit]');if(slot&&calendarSelection){await placeCalendarTask(calendarSelection,slot.dataset.dropDate,slot.dataset.dropMinute);return}if(edit)openTask(edit.dataset.scheduleEdit);else if(appointment&&typeof openDayflowEditor==='function')openDayflowEditor(appointment.dataset.dayflowEdit);else if(slot&&typeof openDayflowEditor==='function')openDayflowEditor(null,{date:slot.dataset.dropDate,minute:slot.dataset.dropMinute})};
}
let calendarSelection='',calendarDragged='',calendarDragging=false,calendarPlacing=false,calendarDragOrigin='',calendarDragOffset=null;
function taskDuration(t){return t.startTime&&t.endTime?minuteOf(t.endTime)-minuteOf(t.startTime):t.durationMinutes||30}
function calendarBusy(date,exclude=''){return dayEntries(date,exclude).filter(e=>e.source==='DayFlow'?!!e.time||e.blocksDay===true:!!data.tasks.find(t=>t.id===e.id)?.startTime)}
function calendarEvent(e,date,timed=false,lane=0,lanes=1){const task=e.source==='Task',displayTitle=task?e.title+' ('+(projectOf(e.project)?.name||'Unassigned')+')':e.title,timeLabel=timed?calendarClock(e.start)+'–'+calendarClock(e.end):'',note=(e.note||'').replace(/ in DayFlow/g,''),meta=[timeLabel,task?'Task':'',note].filter(Boolean).join(' · '),label=`${displayTitle} · ${timed?timeLabel:'All day'}${note?' · '+note:''}`;return `<button type="button" class="calendar-event ${task?'local-event':'dayflow-event'}" title="${esc(label)}" aria-label="${esc(label)}" ${task?`draggable="true" data-drag-task="${esc(e.id)}" data-schedule-edit="${esc(e.id)}" ${timed?`data-drag-minute="${e.start}"`:""}`:`data-dayflow-edit="${esc(e.id)}"`} ${timed?`style="top:${(Math.max(e.start,calendarStartMinute)-calendarStartMinute)/30*32}px;height:${Math.max(18,(Math.min(e.end,calendarEndMinute)-Math.max(e.start,calendarStartMinute))/30*32)}px;left:calc(${lane/lanes*100}% + 2px);width:calc(${100/lanes}% - 4px)"`:''}><strong>${esc(displayTitle)}</strong>${meta&&!task?`<small>${esc(meta)}</small>`:''}</button>`}

function scheduleCalendar(days){const dates=Array.from({length:days},(_,i)=>timelineDate(dateDay(scheduleDate)+i));return `<div class="calendar-scroll" tabindex="0" aria-label="Scheduler calendar. Scroll for more dates and times."><div class="calendar-grid" data-days="${days}" style="--calendar-days:${days}"><div class="calendar-corner">Time</div>${dates.map(date=>`<h3 class="calendar-date ${date===localDate()?'current-day':''}">${esc(new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))}</h3>`).join('')}<div class="calendar-next-heading"><button type="button" id="calendarNextDates" aria-label="Next ${days===1?'day':'7 days'}" title="Next ${days===1?'day':'7 days'}">→</button></div><div class="calendar-all-day-label"><button type="button" id="allDayToggle" aria-expanded="${allDayExpanded}" aria-controls="${dates.map(date=>'calendar-all-day-'+date).join(' ')}"><span aria-hidden="true">${allDayExpanded?'▾':'▸'}</span> All day</button></div>${dates.map(date=>`<div id="calendar-all-day-${date}" class="calendar-all-day ${allDayExpanded?'':'is-collapsed'}">${allDayExpanded?`<button type="button" class="all-day-drop" data-drop-date="${date}" data-drop-minute="all" aria-label="Place selected task all day on ${date}">+ Day plan</button>${dayEntries(date).filter(e=>e.start===0&&e.end===1440).map(e=>calendarEvent(e,date)).join('')}`:''}</div>`).join('')}<div class="calendar-nav-spacer" aria-hidden="true"></div><div class="calendar-hours">${Array.from({length:(calendarEndMinute-calendarStartMinute)/60},(_,h)=>`<div>${calendarClock(calendarStartMinute+h*60)}</div>`).join('')}</div>${dates.map(date=>{const timed=dayEntries(date).filter(e=>!(e.start===0&&e.end===1440)&&e.end>calendarStartMinute&&e.start<calendarEndMinute),ends=[],positioned=timed.map(e=>{let lane=ends.findIndex(end=>end<=e.start);if(lane<0)lane=ends.length;ends[lane]=e.end;return {e,lane}}),lanes=Math.max(1,ends.length);return `<div class="calendar-time-column" data-calendar-date="${date}" style="height:${(calendarEndMinute-calendarStartMinute)/30*32}px">${Array.from({length:(calendarEndMinute-calendarStartMinute)/30},(_,i)=>`<button type="button" class="calendar-slot" data-drop-date="${date}" data-drop-minute="${calendarStartMinute+i*30}" aria-label="Place selected task on ${date} at ${calendarClock(calendarStartMinute+i*30)}"></button>`).join('')}${positioned.map(({e,lane})=>calendarEvent(e,date,true,lane,lanes)).join('')}</div>`}).join('')}<div class="calendar-nav-rail" aria-hidden="true"></div></div></div>`}
async function placeCalendarTask(id,date,minute){
 if(calendarPlacing)return false;
 if(!Number.isFinite(dateDay(date))||!(minute==='all'||Number.isInteger(Number(minute))&&Number(minute)>=0&&Number(minute)<1440))return false;
 calendarPlacing=true;const generation=typeof dayflowLive==='undefined'?null:dayflowLive.generation;
 try{
  if(typeof dayflowLive!=='undefined'&&dayflowLive.user&&!await refreshDayflow()){toast('Could not refresh DayFlow. Try again when connected.');return false}
  if(typeof dayflowLive!=='undefined'&&generation!==dayflowLive.generation)return false;
  let task=data.tasks.find(t=>t.id===id);if(!task||task.done)return false;
  if(minute==='all'){const span=task.startDate&&!task.startTime?dateDay(task.endDate)-dateDay(task.startDate):0;Object.assign(task,{startDate:date,endDate:timelineDate(dateDay(date)+Math.max(0,span||0)),startTime:'',endTime:''})}
  else{const start=Number(minute),duration=taskDuration(task),end=start+duration;if(end>1439){toast('This task would finish after the end of the day. Choose an earlier time.');return false}
   const overlaps=calendarBusy(date,id).filter(e=>e.start<end&&e.end>start);
   if(overlaps.length){const before=JSON.stringify(task),message='This time on '+date+' overlaps:\n'+overlaps.map(e=>'• '+e.title+' ('+(e.blocksDay?'time needs review':calendarClock(e.start)+'–'+calendarClock(e.end))+')').join('\n')+'\n\nPlace the task here anyway?';if(!await requestCalendarConfirmation('Place task here?',message,'Yes, place it here'))return false;task=data.tasks.find(t=>t.id===id);if(!task||task.done||JSON.stringify(task)!==before||typeof dayflowLive!=='undefined'&&generation!==dayflowLive.generation){toast('The task or account changed. Please try again.');return false}}
   Object.assign(task,{startDate:date,endDate:date,startTime:clockOf(start),endTime:clockOf(end),durationMinutes:duration})}
  calendarSelection='';save();render();toast(minute==='all'?'Task moved to '+date:'Task scheduled for '+date+' at '+calendarClock(Number(minute)));return true;
 }finally{calendarPlacing=false;if(typeof syncWorkspace==='function')setTimeout(()=>syncWorkspace(),0)}
}
function requestCalendarConfirmation(title,message,yesLabel='Yes'){
 const dialog=document.getElementById('calendarConfirmDialog');if(!dialog||dialog.open)return Promise.resolve(false);
 return new Promise(resolve=>{let finished=false;const no=document.getElementById('calendarConfirmNo'),yes=document.getElementById('calendarConfirmYes');document.getElementById('calendarConfirmTitle').textContent=title;document.getElementById('calendarConfirmMessage').textContent=message;yes.textContent=yesLabel;dialog.returnValue='no';
  const finish=value=>{if(finished)return;finished=true;dialog.returnValue=value?'yes':'no';if(dialog.open)dialog.close();resolve(value)};
  no.onclick=()=>finish(false);yes.onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(false)};dialog.onclose=()=>{if(!dialog.open)finish(false)};dialog.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false)}else if(e.key==='Enter'&&e.target!==yes){e.preventDefault();e.stopPropagation();finish(false)}};dialog.showModal();no.focus();
 });
}

function calendarDropTarget(event){
 const direct=event.target.closest('[data-drop-date]');if(direct?.dataset.dropMinute==='all')return {element:direct,date:direct.dataset.dropDate,minute:'all'};
 const column=event.target.closest('.calendar-time-column');if(!column)return null;const rect=column.getBoundingClientRect();let minute=direct?Number(direct.dataset.dropMinute):null;
 if(rect.height>0&&calendarDragOrigin==='calendar'&&calendarDragOffset!==null)minute=Math.round(calendarStartMinute+(event.clientY-rect.top-calendarDragOffset)/32*30);
 else if(minute===null&&rect.height>0)minute=calendarStartMinute+Math.floor((event.clientY-rect.top)/32)*30;
 if(!Number.isFinite(minute))return null;minute=Math.max(0,Math.min(1439,minute));return {element:direct||column,date:column.dataset.calendarDate,minute};
}
function wireCalendar(){
 const section=$('#scheduleSection');
 section.ondragover=e=>{const target=calendarDropTarget(e);if(!target||!calendarDragged)return;e.preventDefault();e.dataTransfer.dropEffect='move';section.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover'));target.element.classList.add('drop-hover')};
 section.ondrop=async e=>{const target=calendarDropTarget(e);if(!target)return;e.preventDefault();const id=calendarDragged;calendarDragged='';calendarDragging=false;calendarDragOrigin='';calendarDragOffset=null;$('#projects').classList.remove('task-return-ready','return-drop-hover');section.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover'));if(id)await placeCalendarTask(id,target.date,target.minute)};
}

document.addEventListener('dragstart',e=>{const source=e.target.closest('[data-drag-task]');if(!source||source.getAttribute('draggable')!=='true')return;calendarDragged=source.dataset.dragTask;calendarDragOrigin=source.closest('#scheduleSection')?'calendar':'sidebar';calendarDragOffset=source.hasAttribute('data-drag-minute')?e.clientY-source.getBoundingClientRect().top+(Math.max(calendarStartMinute,Number(source.dataset.dragMinute))-Number(source.dataset.dragMinute))/30*32:null;calendarDragging=true;if(calendarDragOrigin==='calendar')$('#projects').classList.add('task-return-ready');calendarSelection='';e.dataTransfer.setData('application/x-solo-task',calendarDragged);e.dataTransfer.effectAllowed='move'});
document.addEventListener('dragend',()=>{calendarDragging=false;calendarDragged='';calendarDragOrigin='';calendarDragOffset=null;$('#projects').classList.remove('task-return-ready','return-drop-hover');document.querySelectorAll('#scheduleSection .drop-hover').forEach(el=>el.classList.remove('drop-hover'));if(typeof syncWorkspace==='function')setTimeout(()=>syncWorkspace(),0)});

function unscheduleCalendarTask(id){
 const task=data.tasks.find(t=>t.id===id);if(!task||!task.startDate||calendarPlacing)return false;
 const durationMinutes=taskDuration(task);Object.assign(task,{startDate:'',endDate:'',startTime:'',endTime:'',durationMinutes});calendarSelection='';calendarDragged='';calendarDragOrigin='';calendarDragOffset=null;calendarDragging=false;
 expandedProjects.add(task.project||'');save();render();const button=[...document.querySelectorAll('[data-sidebar-task]')].find(b=>b.dataset.sidebarTask===id);button?.scrollIntoView?.({block:'nearest'});toast(task.project?'Task returned to the project list.':'Task removed from calendar. Available in Task Views.');return true;
}
const calendarReturnList=document.getElementById('projects');
calendarReturnList.addEventListener('dragover',e=>{if(calendarDragOrigin!=='calendar'||!calendarDragged)return;e.preventDefault();e.dataTransfer.dropEffect='move';calendarReturnList.classList.add('return-drop-hover')});
calendarReturnList.addEventListener('dragleave',e=>{if(!(e.relatedTarget instanceof Node)||!calendarReturnList.contains(e.relatedTarget))calendarReturnList.classList.remove('return-drop-hover')});
calendarReturnList.addEventListener('drop',e=>{if(calendarDragOrigin!=='calendar'||!calendarDragged)return;e.preventDefault();e.stopPropagation();const id=calendarDragged;calendarDragged='';calendarDragOrigin='';calendarDragOffset=null;calendarDragging=false;calendarReturnList.classList.remove('task-return-ready','return-drop-hover');unscheduleCalendarTask(id)});

document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){calendarSelection='';document.querySelectorAll('[data-sidebar-task]').forEach(button=>{button.classList.remove('selected-for-calendar');button.setAttribute('aria-pressed','false')})}});
