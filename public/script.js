import {questions,surveyVersion,googleResults,validAnswers,emptyCounts,combineStats} from './survey-config.js';
const form=document.getElementById('poll');
const results=document.getElementById('results');
const summary=document.getElementById('answers');
const fields=document.getElementById('survey-fields');
const key='fashion-check-cloud-v2';
let token=null,current=null,busy=false,loading=null;
let stats=combineStats(0,emptyCounts()),onlineKnown=false,statsError='';
for(const [index,q] of questions.entries()){
  const fieldset=document.createElement('fieldset');
  const legend=document.createElement('legend');legend.textContent=`${index+1}. ${q.title}`;fieldset.append(legend);
  if(q.multiple){const hint=document.createElement('p');hint.id='priorities-hint';hint.className='question-hint';hint.textContent='Можно выбрать несколько вариантов. Отметьте хотя бы один.';fieldset.append(hint);fieldset.setAttribute('aria-describedby',hint.id);}
  q.options.forEach((text,i)=>{
    const label=document.createElement('label');const input=document.createElement('input');
    input.type=q.multiple?'checkbox':'radio';input.name=q.id;input.value=String(i);input.required=!q.multiple;
    if(q.multiple)input.addEventListener('change',validateMultiple);
    const caption=document.createElement('span');caption.textContent=text;label.append(input,caption);fieldset.append(label);
  });fields.append(fieldset);
}
function validateMultiple(){
  const inputs=[...form.querySelectorAll('input[name="priorities"]')];
  inputs[0].setCustomValidity(inputs.some(input=>input.checked)?'':'Выберите хотя бы один вариант во втором вопросе.');
}
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&/^[a-f0-9]{64}$/.test(saved.token)){token=saved.token;if(validAnswers(saved.answers))current=saved.answers;}}catch{}
function getToken(){if(!token){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}return token;}
function remember(){try{localStorage.setItem(key,JSON.stringify({token,answers:current}));}catch{document.getElementById('storage-note').textContent='Ответы сохраняются в общей базе. Браузер запретил локальное хранение: после перезагрузки он не сможет узнать вашу анкету для редактирования.';}}
function appendChart({title,options,counts,total,note}){
  const card=document.createElement('article');card.className='chart-card';
  const heading=document.createElement('h3');heading.textContent=title;card.append(heading);
  const subtitle=document.createElement('p');subtitle.className='chart-source';subtitle.textContent=note;card.append(subtitle);
  if(!total){const empty=document.createElement('p');empty.className='chart-empty';empty.textContent='Новых ответов пока нет.';card.append(empty);}
  else{
    const list=document.createElement('ul');list.className='chart-list';
    options.forEach((text,i)=>{
      const item=document.createElement('li');const label=document.createElement('div');label.className='chart-label';
      const caption=document.createElement('span');caption.textContent=text;
      const value=document.createElement('span');value.className='chart-value';value.textContent=`${counts[i]} · ${(counts[i]/total*100).toFixed(1).replace('.',',')}%`;
      label.append(caption,value);
      const track=document.createElement('div');track.className='chart-track';track.setAttribute('aria-hidden','true');
      const fill=document.createElement('span');fill.className=`chart-fill tone-${i}`;fill.style.width=`${counts[i]/total*100}%`;track.append(fill);
      item.append(label,track);list.append(item);
    });card.append(list);
  }
  document.getElementById('charts').append(card);
}
function renderCharts(){
  document.getElementById('local-count').textContent=onlineKnown?String(stats.total):'27+';
  document.getElementById('chart-note').textContent=statsError||(onlineKnown?`27 анкет Google Forms + ${stats.onlineTotal} анкет с сайта. Обновление каждые 30 секунд.`:'Показаны 27 анкет Google Forms. Загружаем ответы с сайта…');
  document.getElementById('charts').replaceChildren();
  questions.forEach((q,i)=>{
    if(q.id==='brand')appendChart({title:`6. ${googleResults.brand.title}`,options:googleResults.brand.options,counts:googleResults.brand.counts,total:27,note:'Google Forms · 27 ответов · исходные пять вариантов ответа.'});
    const total=stats.denominators[q.id];
    let note=q.id==='brand'?`${total} ответов на сайте · обновлённые четыре варианта ответа.`:`${total} ответов${q.multiple?' · несколько вариантов: сумма процентов может превышать 100%.':''}`;
    if(q.id==="frequency")note+=" · Вариант «Несколько раз в месяц» добавлен только в новую форму.";
    appendChart({title:`${i+1}. ${q.title}${q.id==='brand'?' — новая версия':''}`,options:q.options,counts:stats.counts[q.id],total,note});
  });
}
async function request(options){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch('/api/votes',{cache:'no-store',...options,signal:controller.signal});if(!response.ok)throw Error();return await response.json();}finally{clearTimeout(timer);}}
function validStats(data){
  return data&&data.version===surveyVersion&&Number.isSafeInteger(data.onlineTotal)&&data.onlineTotal>=0&&data.googleTotal===27&&data.total===27+data.onlineTotal&&questions.every(q=>{
    const n=data.denominators?.[q.id],counts=data.counts?.[q.id];
    if(n!==data.onlineTotal+(q.id==='brand'?0:27)||!Array.isArray(counts)||counts.length!==q.options.length||!counts.every(c=>Number.isSafeInteger(c)&&c>=0&&c<=n))return false;
    const sum=counts.reduce((a,b)=>a+b,0);return q.multiple?sum>=n&&sum<=n*q.options.length:sum===n;
  });
}
async function refreshStats(){
  if(loading)return loading;
  loading=(async()=>{try{const data=await request();if(!validStats(data))throw Error();stats=data;onlineKnown=true;statsError='';}catch{statsError=onlineKnown?'Не удалось обновить статистику. Показаны последние загруженные данные.':'Ответы с сайта пока недоступны. Показаны только 27 анкет Google Forms.';}renderCharts();})();
  try{await loading;}finally{loading=null;}
}
function showSummary(answers,focus){summary.replaceChildren();for(const q of questions){const dt=document.createElement('dt');dt.textContent=q.title;const dd=document.createElement('dd');dd.textContent=(q.multiple?answers[q.id]:[answers[q.id]]).map(i=>q.options[i]).join('; ');summary.append(dt,dd);}form.hidden=true;results.hidden=false;if(focus)results.focus();}
form.addEventListener('submit',async event=>{
  event.preventDefault();validateMultiple();if(busy||!form.reportValidity())return;
  const data=new FormData(form);const answers={};
  for(const q of questions)answers[q.id]=q.multiple?data.getAll(q.id).map(Number):Number(data.get(q.id));
  if(!validAnswers(answers))return;
  const payload={version:surveyVersion,token:getToken(),answers};remember();busy=true;
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  const status=document.getElementById('submit-status');status.textContent='Сохраняем анкету…';
  try{const reply=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(reply.saved!==true||reply.version!==surveyVersion)throw Error();current=answers;remember();status.textContent='';showSummary(answers,true);await refreshStats();}
  catch{status.textContent='Не удалось подтвердить сохранение. Проверьте интернет и попробуйте снова. Повторная отправка этой анкеты не создаст дубликат.';}
  finally{busy=false;button.disabled=false;}
});
document.getElementById('edit').addEventListener('click',()=>{results.hidden=true;form.hidden=false;form.querySelector('input').focus();});
document.getElementById('next-participant').addEventListener('click',()=>{current=null;token=null;remember();form.reset();validateMultiple();results.hidden=true;form.hidden=false;form.querySelector('input').focus();});
document.getElementById('refresh-stats').addEventListener('click',refreshStats);
if(current){for(const input of form.querySelectorAll('input')){const q=questions.find(q=>q.id===input.name);input.checked=q.multiple?current[q.id].includes(Number(input.value)):current[q.id]===Number(input.value);}showSummary(current,false);}
validateMultiple();renderCharts();refreshStats();setInterval(()=>{if(!document.hidden)refreshStats();},30000);window.addEventListener('focus',refreshStats);
