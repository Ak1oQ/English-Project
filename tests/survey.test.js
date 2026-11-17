import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,validPayload,summarize} from '../lib/survey.js';
const payload={token:'a'.repeat(64),quality:0,priority:1,vintage:2,durability:3};
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(data){this.data=data;return this}}}
function req(method,body=payload){return {method,body,headers:{'content-type':'application/json'}}}
test('accepts only complete numeric options and a 256-bit token',()=>{
 assert(validPayload(payload));
 for(const bad of [{...payload,quality:4},{...payload,quality:-1},{...payload,vintage:1.1},{...payload,priority:'1'},{...payload,token:'short'},{token:payload.token}]) assert(!validPayload(bad));
});
test('aggregate counts have the same total for all questions',()=>{
 const stats=summarize([{quality:0,priority:1,vintage:2,durability:3,count:'2'},{quality:1,priority:1,vintage:0,durability:1,count:'3'}]);
 assert.equal(stats.total,5);assert.deepEqual(stats.counts.priority,[0,5,0,0]);
 for(const counts of Object.values(stats.counts))assert.equal(counts.reduce((a,b)=>a+b),5);
 assert.equal(summarize([]).total,0);
});
test('save, retry, edit, new respondent and public aggregate flow',async()=>{
 const db=new Map();
 const sql=async(strings,...values)=>{
  if(strings[0].includes('INSERT')){const [hash,quality,priority,vintage,durability]=values;db.set(hash,{quality,priority,vintage,durability,count:1});return [];}
  return [...db.values()];
 };
 const handler=createHandler(()=>sql);
 for(const body of [payload,payload,{...payload,quality:2}]){const res=response();await handler(req('POST',body),res);assert.equal(res.code,200);assert.equal(res.data.saved,true);}
 assert.equal(db.size,1);assert.equal([...db.values()][0].quality,2);assert(!db.has(payload.token));
 let res=response();await handler(req('POST',{...payload,token:'b'.repeat(64)}),res);assert.equal(db.size,2);
 res=response();await handler(req('GET'),res);assert.equal(res.data.total,2);assert.deepEqual(res.data.counts.quality,[1,0,1,0]);assert(!JSON.stringify(res.data).includes('token'));assert.equal(res.headers['Cache-Control'],'no-store');
});
test('rejects invalid, cross-site, non-JSON and unsupported requests before database access',async()=>{
 const handler=createHandler(()=>{throw Error('should not access database')});
 for(const [request,code] of [[req('DELETE'),405],[req('POST',{}),400],[{...req('POST'),headers:{'content-type':'text/plain'}},415],[{...req('POST'),headers:{'sec-fetch-site':'cross-site'}},403],[{...req('POST'),headers:{'content-type':'application/json','content-length':'5000'}},413],[req('POST','{'),400]]){const res=response();await handler(request,res);assert.equal(res.code,code);}
});
test('database failure is not reported as a successful save',async()=>{
 const handler=createHandler(()=>{throw Error('private connection string')});const res=response();await handler(req('POST'),res);assert.equal(res.code,503);assert(!res.data.saved);assert(!JSON.stringify(res.data).includes('private'));
});
