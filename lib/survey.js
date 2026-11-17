import { createHash } from 'node:crypto';
export const fields = ['quality', 'priority', 'vintage', 'durability'];
export function validPayload(body) {
  return body && typeof body.token === 'string' && /^[a-f0-9]{64}$/.test(body.token) &&
    fields.every(key => Number.isInteger(body[key]) && body[key] >= 0 && body[key] <= 3);
}
export function summarize(rows) {
  const counts = Object.fromEntries(fields.map(key => [key, [0,0,0,0]]));
  let total = 0;
  for (const row of rows) {
    const count = Number(row.count);
    total += count;
    for (const key of fields) counts[key][Number(row[key])] += count;
  }
  return { total, counts };
}
export function createHandler(getSql) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET','POST'].includes(req.method)) {
      res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Метод не поддерживается.'});
    }
    if (req.method === 'POST') {
      if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({error:'Отправляйте анкету со страницы сайта.'});
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return res.status(415).json({error:'Ожидается JSON.'});
      if (Number(req.headers['content-length']) > 2048) return res.status(413).json({error:'Слишком большой запрос.'});
    }
    try {
      let body;
      if (req.method === 'POST') {
        body = req.body;
        if (typeof body === 'string') {
          if (Buffer.byteLength(body) > 2048) return res.status(413).json({error:'Слишком большой запрос.'});
          try { body=JSON.parse(body); } catch { return res.status(400).json({error:'Некорректный JSON.'}); }
        }
        if (!validPayload(body)) return res.status(400).json({error:'Проверьте ответы: нужны четыре варианта от 0 до 3.'});
      }
      const sql=await getSql();
      if (req.method === 'POST') {
        const hash=createHash('sha256').update(body.token).digest('hex');
        await sql`INSERT INTO fashion_responses (token_hash,quality,priority,vintage,durability)
          VALUES (${hash},${body.quality},${body.priority},${body.vintage},${body.durability})
          ON CONFLICT (token_hash) DO UPDATE SET quality=EXCLUDED.quality, priority=EXCLUDED.priority,
          vintage=EXCLUDED.vintage, durability=EXCLUDED.durability, updated_at=now()`;
        return res.status(200).json({saved:true});
      }
      const rows=await sql`SELECT quality,priority,vintage,durability,COUNT(*)::int AS count
        FROM fashion_responses GROUP BY quality,priority,vintage,durability`;
      return res.status(200).json(summarize(rows));
    } catch {
      // Never expose database URLs, tokens, or raw SQL errors to visitors.
      return res.status(503).json({error:'Сервис временно недоступен. Попробуйте ещё раз позже.'});
    }
  };
}
