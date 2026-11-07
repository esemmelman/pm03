// chrono-node 2.10.0 (MIT) parses English dates locally; speech uses the browser's recognition service.
let quickRecognition=null,quickVoiceFields={},quickVoiceTitle='';
function showCaptureStatus(message){$('#captureStatus').hidden=!message;$('#captureStatus').textContent=message}
function captureDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parseQuickTask(input,now=new Date()){
 const text=input.trim().replace(/\bstart date(?: is| of)?\s+/gi,' starting ').replace(/\bend date(?: is| of)?\s+/gi,' ending ').replace(/^(?:please\s+)?(?:add\s+(?:(?:a|an)\s+)?task\s+(?:to\s+)?|schedule\s+|remind me to\s+)/i,'');if(!text)throw Error('Include a task name.');
 const results=chrono.parse(text,now,{forwardDate:true});if(results.length>2)throw Error('Use one start date and one end date, or enter the dates manually.');
 if(results.length===2&&!/\b(?:start(?:s|ing)?|end(?:s|ing)?|from|through|until|to|between)\b/i.test(text))throw Error('For a date range, say “from Monday to Friday”, or set the dates manually.');
 if(!results.length)return {title:text,startDate:null,endDate:null,fields:{}};
 const first=results[0],last=results[results.length-1],start=first.start,end=last.end||last.start;
 let title=text;for(const result of [...results].reverse())title=title.slice(0,result.index)+' '+title.slice(result.index+result.text.length);
 title=title.replace(/\s+/g,' ').trim();const connectors='(?:start(?:s|ing)?(?: date)?|end(?:s|ing)?(?: date)?|from|through|until|on|at|between|and|to|due)';title=title.replace(new RegExp('(?:\\b'+connectors+'[\\s,]*)+$','i'),'').replace(new RegExp('^(?:'+connectors+'[\\s,]+)+','i'),'').replace(/^[\s,.;]+|[\s,.;]+$/g,'').trim();if(!title)throw Error('Include a task name with the dates.');
 const startDate=captureDate(start.date()),endDate=captureDate(end.date());if(!taskDatesValid(startDate,endDate))throw Error('The end date must be on or after the start date.');
 const fields={};if(start.isCertain('hour')){const a=start.get('hour')*60+(start.get('minute')||0),b=last.end?.isCertain('hour')?last.end.get('hour')*60+(last.end.get('minute')||0):a+30;if(startDate!==endDate||b<=a||b>1439)throw Error('Timed tasks must start and end on the same day. Set dates manually for a multi-day plan.');fields.startTime=clockOf(a);fields.endTime=clockOf(b);fields.durationMinutes=b-a}
 return {title,startDate,endDate,fields};
}
function applyQuickTranscript(transcript){const parsed=parseQuickTask(transcript);$('#quickNoDates').setAttribute('aria-pressed','false');$('#quick').value=parsed.title;if(parsed.startDate){$('#quickStart').value=parsed.startDate;$('#quickEnd').value=parsed.endDate}quickVoiceFields=parsed.fields;quickVoiceTitle=parsed.title;$('#quickStart').setCustomValidity('');$('#quickEnd').setCustomValidity('');showCaptureStatus('Review the task and dates. Press Enter to save.');$('#quick').focus();return parsed}
function prepareQuickCapture(){const parsed=parseQuickTask($('#quick').value);if($('#quickNoDates').getAttribute('aria-pressed')==='true')return {title:parsed.title,fields:{}};if(parsed.startDate){$('#quickStart').value=parsed.startDate;$('#quickEnd').value=parsed.endDate}const fields=parsed.startDate?parsed.fields:($('#quick').value.trim()===quickVoiceTitle?quickVoiceFields:{});if(fields.startTime&&$('#quickStart').value!==$('#quickEnd').value)throw Error('Clear the spoken time or use a single date for a timed task.');return {title:parsed.title,fields}}
function clearQuickVoice(){if(quickRecognition){quickRecognition.abort();quickRecognition=null}quickVoiceFields={};quickVoiceTitle='';$('#quickMic').setAttribute('aria-pressed','false');showCaptureStatus('')}
$('#quickForm').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('input')){event.preventDefault();if(quickRecognition){quickRecognition.stop();showCaptureStatus('Finishing voice input… Review the result, then press Enter.');return}$('#quickForm').requestSubmit()}});
$('#quickMic').onclick=()=>{
 if(quickRecognition){quickRecognition.stop();return}
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){showCaptureStatus('Voice input is unavailable in this browser. Use your device keyboard microphone, or type and press Enter.');$('#quick').focus();return}
 try{const recognition=new Recognition();quickRecognition=recognition;recognition.lang='en-US';recognition.continuous=false;recognition.interimResults=true;$('#quickMic').setAttribute('aria-pressed','true');showCaptureStatus('Listening… Say a task and dates, such as “Prepare report from Monday to Friday”.');let finalText='',heard='',failed=false;
 recognition.onresult=event=>{if(quickRecognition!==recognition)return;heard=Array.from(event.results,result=>result[0].transcript).join(' ');$('#quick').value=heard;finalText=Array.from(event.results).every(result=>result.isFinal)?heard:''};
 recognition.onerror=event=>{if(quickRecognition!==recognition)return;failed=true;const messages={'not-allowed':'Microphone access denied. Allow it in browser settings or type your task.','audio-capture':'No microphone is available. Type your task or connect a microphone.','no-speech':'No speech detected. Try again.',network:'Voice recognition needs a connection. Try again or type your task.'};showCaptureStatus(messages[event.error]||'Voice input is unavailable. Type your task instead.')};
 recognition.onend=()=>{if(quickRecognition!==recognition)return;quickRecognition=null;$('#quickMic').setAttribute('aria-pressed','false');if(failed)return;if(!(finalText||heard)){showCaptureStatus('No speech detected. Try again.');return}try{applyQuickTranscript(finalText||heard)}catch(error){$('#quick').value=finalText||heard;showCaptureStatus(error.message)}};
 recognition.start();
 }catch{quickRecognition=null;$('#quickMic').setAttribute('aria-pressed','false');showCaptureStatus('Could not start voice input. Type your task instead.')}
};
