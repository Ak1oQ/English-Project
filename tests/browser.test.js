import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import {questions,surveyVersion,googleResults,validAnswers,emptyCounts,combineStats,upgradeLegacyAnswers} from '../public/survey-config.js';
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.style={};this.hidden=false;this.checked=false;this.value='';this.validation='';this.textContent='';}
 append(...nodes){this.children.push(...nodes)}replaceChildren(){this.children=[]}setAttribute(){}addEventListener(event,fn){this.handlers[event]=fn}focus(){}setCustomValidity(text){this.validation=text}
 descendants(){return this.children.flatMap(n=>[n,...n.descendants()]);}
 querySelectorAll(selector){return this.descendants().filter(n=>selector.startsWith('input')?n.tag==='input'&&(!selector.includes('name=')||n.name==='priorities'):n.tag==='button');}
 querySelector(selector){return this.querySelectorAll(selector)[0]}
 reportValidity(){return !this.descendants().some(n=>n.validation)}
 reset(){for(const input of this.querySelectorAll('input'))input.checked=false;}
}
function boot(db,storage,network){
 const els={};for(const id of ['poll','results','answers','survey-fields','storage-note','local-count','chart-note','charts','submit-status','edit','next-participant','refresh-stats'])els[id]=new Element();
 els.poll.append(els['survey-fields'],new Element('button'));
 const context=vm.createContext({questions,surveyVersion,googleResults,validAnswers,emptyCounts,combineStats,upgradeLegacyAnswers,crypto:webcrypto,document:{getElementById:id=>els[id],createElement:tag=>new Element(tag)},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},setTimeout,clearTimeout,setInterval(){},window:{addEventListener(){}},AbortController,
 FormData:class{constructor(form){this.inputs=form.querySelectorAll('input').filter(i=>i.checked)}getAll(name){return this.inputs.filter(i=>i.name===name).map(i=>i.value)}get(name){return this.getAll(name)[0]??null}},
 fetch:async(url,options)=>{
  if(network.fail)throw Error();
  if(options.method==='POST'){const p=JSON.parse(options.body);assert(validAnswers(p.answers));db.set(p.token,p.answers);return {ok:true,json:async()=>({saved:true,version:surveyVersion})};}
  const counts=emptyCounts();for(const answers of db.values())for(const q of questions)for(const i of q.multiple?answers[q.id]:[answers[q.id]])counts[q.id][i]++;
  return {ok:true,json:async()=>combineStats(db.size,counts)};
 }});
 const code=fs.readFileSync(new URL('../public/script.js',import.meta.url),'utf8').replace(/^import .*?;\r?\n/,'');
 vm.runInContext(code,context);
 return {els,submit:()=>els.poll.handlers.submit({preventDefault(){}})};
}
test('browser flow: ten questions, mandatory checkbox, save, edit, reload, network failure, retry and shared charts',async()=>{
 const db=new Map(),storage={},network={fail:false};let app=boot(db,storage,network);await new Promise(setImmediate);
 assert.equal(app.els['survey-fields'].children.length,10);assert.equal(app.els.charts.children.length,10);assert.equal(app.els['local-count'].textContent,'27');
 for(const input of app.els.poll.querySelectorAll('input'))input.checked=input.value==='0';
 for(const input of app.els.poll.querySelectorAll('input[name="priorities"]'))input.checked=false;
 await app.submit();assert.equal(db.size,0);
 for(const input of app.els.poll.querySelectorAll('input[name="priorities"]'))input.checked=['0','2'].includes(input.value);
 await app.submit();assert.equal(db.size,1);assert.equal(app.els['local-count'].textContent,'28');assert.equal(app.els.answers.children.length,20);assert(app.els.poll.hidden);
 app.els.edit.handlers.click();await app.submit();assert.equal(db.size,1);
 app=boot(db,storage,network);await new Promise(setImmediate);assert(app.els.poll.hidden);assert.equal(app.els.poll.querySelectorAll('input[name="priorities"]').filter(i=>i.checked).length,2);
 app.els['next-participant'].handlers.click();for(const input of app.els.poll.querySelectorAll('input'))input.checked=input.value==='0';
 network.fail=true;await app.submit();assert.equal(db.size,1);assert(!app.els.poll.hidden);assert(app.els['submit-status'].textContent.includes('Не удалось'));
 network.fail=false;await app.submit();assert.equal(db.size,2);assert.equal(app.els['local-count'].textContent,'29');
});

test('browser preserves the previous token and converts its four-option answer for editing',async()=>{
 const stored=Object.fromEntries(questions.map(q=>[q.id,q.multiple?[0,2]:0]));stored.brand=3;
 const storage={'fashion-check-cloud-v2':JSON.stringify({token:'a'.repeat(64),answers:stored})};
 const db=new Map(),network={fail:false};const app=boot(db,storage,network);await new Promise(setImmediate);
 assert(app.els.poll.hidden);const brand=app.els.poll.querySelectorAll('input').filter(i=>i.name==='brand');assert.equal(brand.length,5);assert(brand[4].checked);
 app.els.edit.handlers.click();await app.submit();assert.equal(db.size,1);assert(db.has('a'.repeat(64)));assert.equal([...db.values()][0].brand,4);
});
