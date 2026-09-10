import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

export default defineConfig({
    dialect: 'postgresql',
    dbCredentials: { url: process.env.DATABASE_URL! },
    out: './drizzle',
    schema: './src/db/schema.ts',
    schemaFilter: ['public', 'neon_auth'],
});