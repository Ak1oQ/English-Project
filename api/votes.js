import { neon } from '@neondatabase/serverless';
import { createHandler } from '../lib/survey.js';
export default createHandler(() => {
  if (!process.env.DATABASE_URL) throw new Error('Missing database configuration');
  return neon(process.env.DATABASE_URL);
});
