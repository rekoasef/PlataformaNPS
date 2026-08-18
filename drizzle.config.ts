import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.staging' })

const { STAGING_DB_USER, STAGING_DB_PASSWORD, STAGING_DB_NAME } = process.env

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dbCredentials: {
    url: `postgresql://${STAGING_DB_USER}:${STAGING_DB_PASSWORD}@127.0.0.1:5433/${STAGING_DB_NAME}`,
  },
})
