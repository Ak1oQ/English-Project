import test from 'node:test';
import assert from 'node:assert/strict';
import {questions,googleResults,surveyVersion,validAnswers} from '../public/survey-config.js';
import {createHandler,validPayload,summarize} from '../lib/survey.js';
const answers=()=>Object.fromEntries(questions.map(q=>[q.id,q.multiple?[0,2]:0]));
const payload={token:'a'.repeat(64),version:surveyVersion,answers:answers()};
const req=(method,body=payload)=>({method,body,headers:{'content-type':'application/json'}});
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(data){this.data=data;return this}});
test('ten questions, only question two accepts several choices',()=>{
 assert.equal(questions.length,10);assert.equal(questions.filter(q=>q.multiple).length,1);assert(questions[1].multiple);assert(validPayload(payload));
 for(const selected of [[],[0,0],[5],['0'],0])assert(!validAnswers({...answers(),priorities:selected}));
 for(const bad of [{...payload,version:1},{...payload,token:'short'},{...payload,answers:{...answers(),checklist:3}},{...payload,answers:{...answers(),frequency:null}}])assert(!validPayload(bad));
});
test('Google Forms counts match 27 responses; checkbox denominator is respondents',()=>{
 assert.equal(googleResults.total,27);
 for(const [id,counts] of Object.entries(googleResults.counts))if(id!=='priorities')assert.equal(counts.reduce((a,b)=>a+b),27,id);
 assert.deepEqual(googleResults.counts.priorities,[11,6,14,3,9]);assert.equal(googleResults.counts.priorities.reduce((a,b)=>a+b),43);
 assert.equal(googleResults.brand.counts.reduce((a,b)=>a+b),27);assert.equal(googleResults.brand.options.length,5);
 const stats=summarize([]);assert.equal(stats.total,27);assert.equal(stats.denominators.brand,0);assert.deepEqual(stats.counts.brand,[0,0,0,0]);
});
test('combines aggregates without fabricating rows or merging incompatible question six',()=>{
 const stats=summarize([{answers:answers(),count:2}]);assert.equal(stats.total,29);assert.equal(stats.onlineTotal,2);assert.equal(stats.denominators.brand,2);assert.equal(stats.denominators.priorities,29);
 assert.deepEqual(stats.counts.priorities,[13,6,16,3,9]);assert.deepEqual(stats.counts.brand,[2,0,0,0]);
 assert.equal(stats.counts.frequency.reduce((a,b)=>a+b),29);
});
test('new table setup, save, idempotent edit, next participant, reload and aggregate response',async()=>{
 const db=new Map();let creates=0;
 const sql=async(strings,...values)=>{if(strings[0].includes('CREATE TABLE')){creates++;return [];}if(strings[0].includes('INSERT')){const [hash,encoded]=values;db.set(hash,JSON.parse(encoded));return [];}return [...db.values()].map(a=>({answers:a,count:1}));};
 const handler=createHandler(()=>sql);
 for(const body of [payload,payload,{...payload,answers:{...answers(),frequency:4}}]){const res=response();await handler(req('POST',body),res);assert.equal(res.code,200);assert(res.data.saved);}
 assert.equal(creates,1);assert.equal(db.size,1);assert.equal([...db.values()][0].frequency,4);assert(!db.has(payload.token));
 let res=response();await handler(req('POST',{...payload,token:'b'.repeat(64)}),res);assert.equal(db.size,2);
 res=response();await handler(req('GET'),res);assert.equal(res.data.total,29);assert.equal(res.data.onlineTotal,2);assert.equal(res.data.googleTotal,27);assert(!JSON.stringify(res.data).includes('token'));assert.equal(res.headers['Cache-Control'],'no-store');
 await handler(req('GET'),response());assert.equal(db.size,2);
});
test('rejects incomplete, out of range and legacy questionnaires before touching storage',async()=>{
 const handler=createHandler(()=>{throw Error('must not run')});
 for(const [request,status] of [[req('POST',{}),400],[req('POST',{...payload,answers:{}}),400],[req('POST',{...payload,version:1}),400],[req('DELETE'),405],[{...req('POST'),headers:{'sec-fetch-site':'cross-site'}},403],[{...req('POST'),headers:{'content-type':'text/plain'}},415],[{...req('POST'),headers:{'content-type':'application/json','content-length':'9999'}},413]]){const res=response();await handler(request,res);assert.equal(res.code,status);}
});
test('failed initialization can retry, and failures never report a saved vote',async()=>{
 let attempts=0;const handler=createHandler(()=>async(strings)=>{if(strings[0].includes('CREATE TABLE')&&attempts++===0)throw Error('private');return [];});
 let res=response();await handler(req('GET'),res);assert.equal(res.code,503);assert(!JSON.stringify(res.data).includes('private'));
 res=response();await handler(req('GET'),res);assert.equal(res.code,200);assert.equal(res.data.total,27);
});
