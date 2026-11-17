'use strict';
const form=document.getElementById('poll');
const results=document.getElementById('results');
const answers=document.getElementById('answers');
const questions = [
  {name:'quality', title:'Качество новой одежды', options:['Да, часто','Иногда','Нет','Затрудняюсь ответить']},
  {name:'priority', title:'Главное при выборе', options:['Качество и долговечность','Доступная цена','Известный бренд','Дизайн и посадка']},
  {name:'vintage', title:'Отношение к винтажу', options:['Уже покупаю','Хочу попробовать','Пока не рассматриваю','Затрудняюсь ответить']},
  {name:'durability', title:'Срок службы одежды', options:['Меньше года','1–2 года','Больше двух лет','По-разному / не знаю']}
];
const key='fashion-check-cloud-v1';
let current=null;
let token=null;
try {
  const saved=JSON.parse(localStorage.getItem(key)||'null');
  if (saved && /^[a-f0-9]{64}$/.test(saved.token)) {
    token=saved.token;
    if (saved.answers && questions.every(q=>q.options.includes(saved.answers[q.name]))) current=saved.answers;
  }
} catch {}
function getToken(){
  if (!token) {
    const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
    token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  return token;
}
function remember(){
  try {localStorage.setItem(key,JSON.stringify({token,answers:current}));}
  catch {document.getElementById('storage-note').textContent='Ответы сохраняются в общей базе. Браузер запретил локальное хранение: после перезагрузки он не сможет узнать вашу анкету для редактирования.';}
}
let stats=null;
let statsError='';
let busy=false;
let loading=null;
function renderCharts(){
  const total=stats?.total;
  document.getElementById('local-count').textContent=stats?String(stats.total):'—';
  document.getElementById('chart-note').textContent=statsError||(stats?`Общая статистика · ${total} сохранённых анкет. Обновляется каждые 30 секунд.`:'Загружаем общую статистику…');
  const charts=document.getElementById('charts');charts.replaceChildren();
  for(const q of questions){
    const card=document.createElement('article');card.className='chart-card';
    const title=document.createElement('h3');title.textContent=q.title;card.append(title);
    if(!total){
      const empty=document.createElement('p');empty.className='chart-empty';
      empty.textContent=total===0?'Пока нет анкет. Станьте первым участником!':(statsError?'Статистика недоступна. Попробуйте обновить её.':'Загрузка…');card.append(empty);
    } else {
      const list=document.createElement('ul');list.className='chart-list';
      q.options.forEach((option,i)=>{
        const count=stats.counts[q.name][i];
        const percent=count/total*100;
        const item=document.createElement('li');
        const label=document.createElement('div');label.className='chart-label';
        const name=document.createElement('span');name.textContent=option;
        const value=document.createElement('strong');value.textContent=`${count} · ${percent.toFixed(1).replace('.',',')}%`;
        label.append(name,value);
        const track=document.createElement('div');track.className='chart-track';track.setAttribute('aria-hidden','true');
        const bar=document.createElement('span');bar.className=`chart-fill tone-${i}`;bar.style.width=`${percent}%`;track.append(bar);
        item.append(label,track);list.append(item);
      });card.append(list);
    }charts.append(card);
  }
}
async function request(options){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch('/api/votes',{cache:'no-store',...options,signal:controller.signal});
    if(!response.ok)throw new Error('Request failed');
    return await response.json();
  }finally{clearTimeout(timeout);}
}
async function refreshStats(){
  if(loading)return loading;
  loading=(async()=>{
    try{
      const data=await request();
      if(!Number.isInteger(data.total)||data.total<0||!questions.every(q=>Array.isArray(data.counts?.[q.name])&&data.counts[q.name].length===4&&data.counts[q.name].every(n=>Number.isInteger(n)&&n>=0)&&data.counts[q.name].reduce((a,b)=>a+b,0)===data.total))throw Error();
      stats=data;statsError='';
    }catch{statsError=stats?'Не удалось обновить статистику. Показаны последние загруженные данные.':'Не удалось загрузить статистику. Проверьте подключение сайта к базе данных.';}
    renderCharts();
  })();
  try{await loading;}finally{loading=null;}
}
function showSummary(row,focus){
  answers.replaceChildren();
  for(const q of questions){const dt=document.createElement('dt');dt.textContent=q.title;const dd=document.createElement('dd');dd.textContent=row[q.name];answers.append(dt,dd);}
  form.hidden=true;results.hidden=false;if(focus)results.focus();
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;
  const data=new FormData(form);const row={};const payload={token:getToken()};
  for(const q of questions){row[q.name]=data.get(q.name);payload[q.name]=q.options.indexOf(row[q.name]);}
  // Remember the token before networking so a retry after reload targets the same row.
  remember();busy=true;
  const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
  const status=document.getElementById('submit-status');status.textContent='Сохраняем анкету…';
  try{
    const response=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(response.saved!==true)throw Error();
    current=row;remember();status.textContent='';showSummary(row,true);
    await refreshStats();
  }catch{status.textContent='Не удалось подтвердить сохранение. Проверьте интернет и попробуйте снова. Повторная отправка этой анкеты не увеличит счётчик.';}
  finally{busy=false;submit.disabled=false;}
});
document.getElementById('edit').addEventListener('click',()=>{results.hidden=true;form.hidden=false;form.querySelector('input').focus();});
document.getElementById('next-participant').addEventListener('click',()=>{current=null;token=null;remember();form.reset();results.hidden=true;form.hidden=false;form.querySelector('input').focus();});
document.getElementById('refresh-stats').addEventListener('click',refreshStats);
if(current){for(const input of form.querySelectorAll('input[type="radio"]'))input.checked=current[input.name]===input.value;showSummary(current,false);}
renderCharts();refreshStats();
setInterval(()=>{if(!document.hidden)refreshStats();},30000);
window.addEventListener('focus',refreshStats);