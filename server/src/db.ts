import { PrismaClient } from '@prisma/client'

/**
 * On serverless (Netlify Functions) we connect through Supabase's transaction
 * pooler. Prisma must be told it's talking to pgBouncer, otherwise reused pooled
 * connections collide on prepared statements ("prepared statement s1 already
 * exists", Postgres 42P05). We append the required params automatically so a
 * plain pooler URL just works. String concatenation (not new URL()) keeps
 * passwords with special characters intact.
 */
function serverlessDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return url
  const isPooler = url.includes('pooler.supabase.com') || url.includes(':6543')
  if (!isPooler) return url

  let tuned = url
  if (!/[?&]pgbouncer=/.test(tuned)) {
    tuned += (tuned.includes('?') ? '&' : '?') + 'pgbouncer=true'
  }
  if (!/[?&]connection_limit=/.test(tuned)) {
    tuned += '&connection_limit=1'
  }
  return tuned
}

const url = serverlessDatabaseUrl()

export const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient()
