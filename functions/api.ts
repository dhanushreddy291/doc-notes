import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import { attachDatabasePool } from '@neon/functions';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as jose from 'jose';
import OpenAI from 'openai';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { documents } from '../src/db/schema';
import { eq } from 'drizzle-orm';

type AppVariables = { userId: string };

const app = new Hono<{ Variables: AppVariables }>();

// The frontend is a Vite single-page app.
// The browser makes cross-origin requests to the function, so set CORS headers.
app.use(
  '/*',
  cors({
    origin: (origin) => origin,
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);
const db = drizzle(pool);

const JWKS = jose.createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));

const ai = new OpenAI({
  apiKey: process.env.NEON_AI_GATEWAY_TOKEN,
  baseURL: `${process.env.NEON_AI_GATEWAY_BASE_URL}/v1`,
});

const authMiddleware = async (
  c: Context<{ Variables: AppVariables }>,
  next: Next,
) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing token' }, 401);
  }
  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: new URL(process.env.NEON_AUTH_BASE_URL!).origin,
    });
    if (!payload.sub) {
      return c.json({ error: 'Unauthorized: Invalid token subject' }, 401);
    }
    c.set('userId', payload.sub);
    await next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    return c.json({ error: 'Unauthorized: Token verification failed' }, 401);
  }
};

const s3 = new S3Client({ forcePathStyle: true });

app.use('/documents*', authMiddleware);

app.post('/documents', async (c) => {
  const userId = c.get('userId');

  const form = await c.req.formData();
  const file = form.get('file') as File;
  if (!file) return c.json({ error: 'Missing file' }, 400);
  const content = await file.text();

  const objectKey = `documents/${userId}/${crypto.randomUUID()}.txt`;
  await s3.send(
    new PutObjectCommand({
      Bucket: 'uploads',
      Key: objectKey,
      Body: content,
      ContentType: file.type || 'text/plain',
    }),
  );

  const response = await ai.chat.completions.create({
    model: 'gpt-oss-120b',
    messages: [
      { role: 'user', content: `Summarize this document:\n\n${content}` },
    ],
  });
  const summary = response.choices[0].message.content ?? '';

  const [row] = await db
    .insert(documents)
    .values({ userId, filename: file.name, objectKey, summary })
    .returning();

  return c.json(row, 201);
});

app.get('/documents', async (c) => {
  const userId = c.get('userId');
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId));
  return c.json(rows);
});

app.patch('/documents/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id));
  if (!existing || existing.userId !== userId) {
    return c.json({ error: 'Not found' }, 404);
  }

  const [row] = await db
    .update(documents)
    .set({ starred: !existing.starred })
    .where(eq(documents.id, id))
    .returning();
  return c.json(row);
});

export default app;