// Ensure server/.env exists (copied from .env.example) so Prisma and the
// server can read DATABASE_URL / JWT_SECRET on a fresh clone. Cross-platform.
import { existsSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const envPath = join(here, '..', '.env')
const examplePath = join(here, '..', '.env.example')

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath)
  console.log('→ Created server/.env from .env.example')
}
