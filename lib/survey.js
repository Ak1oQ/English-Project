import {createHash} from 'node:crypto';
import {surveyVersion,questions,validAnswers,emptyCounts,combineStats,upgradeLegacyAnswers} from '../public/survey-config.js';
export function validPayload(body){return body && body.version===surveyVersion && typeof body.token==='string' && /^[a-f0-9]{64}$/.test(body.token) && validAnswers(body.answers);}
export function summarize(rows){
  let total=0;const counts=emptyCounts();
  for(const row of rows){
    const stored=typeof row.answers==='string'?JSON.parse(row.answers):row.answers;
    const answers=stored?._version===surveyVersion?stored:upgradeLegacyAnswers(stored);
    const count=Number(row.count);
    if(!validAnswers(answers)||!Number.isSafeInteger(count)||count<0)throw Error('Invalid stored questionnaire');
    total+=count;
    for(const q of questions){const selected=q.multiple?answers[q.id]:[answers[q.id]];for(const i of selected)counts[q.id][i]+=count;}
  }
  return combineStats(total,counts);
}
export function createHandler(getSql){
  let initialized=null;
  async function ensureTable(sql){
    if(!initialized){
      initialized=sql`CREATE TABLE IF NOT EXISTS fashion_responses_v2 (
        token_hash text PRIMARY KEY CHECK (length(token_hash)=64),
        answers jsonb NOT NULL CHECK (jsonb_typeof(answers)='object'),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`.catch(error=>{initialized=null;throw error;});
    }
    await initialized;
  }
  return async function handler(req,res){
    res.setHeader('Cache-Control','no-store');
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Метод не поддерживается.'});}
    if(req.method==='POST'){
      if(req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Отправляйте анкету со страницы сайта.'});
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return res.status(415).json({error:'Ожидается JSON.'});
      if(Number(req.headers['content-length'])>4096)return res.status(413).json({error:'Слишком большой запрос.'});
    }
    try{
      let body;
      if(req.method==='POST'){
        body=req.body;
        if(typeof body==='string'){
          if(Buffer.byteLength(body)>4096)return res.status(413).json({error:'Слишком большой запрос.'});
          try{body=JSON.parse(body);}catch{return res.status(400).json({error:'Некорректный JSON.'});}
        }
        if(!validPayload(body))return res.status(400).json({error:'Проверьте ответы на все 10 вопросов.'});
      }
      const sql=await getSql();await ensureTable(sql);
      if(req.method==='POST'){
        const hash=createHash('sha256').update(body.token).digest('hex');
        const encoded=JSON.stringify({...Object.fromEntries(questions.map(q=>[q.id,body.answers[q.id]])),_version:surveyVersion});
        await sql`INSERT INTO fashion_responses_v2 (token_hash,answers) VALUES (${hash},${encoded}::jsonb)
          ON CONFLICT(token_hash) DO UPDATE SET answers=EXCLUDED.answers,updated_at=now()`;
        return res.status(200).json({saved:true,version:surveyVersion});
      }
      const rows=await sql`SELECT answers,COUNT(*)::int AS count FROM fashion_responses_v2 GROUP BY answers`;
      return res.status(200).json(summarize(rows));
    }catch{return res.status(503).json({error:'Сервис временно недоступен. Попробуйте ещё раз позже.'});}
  };
}
