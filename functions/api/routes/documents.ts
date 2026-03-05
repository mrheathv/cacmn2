import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { queryAll, queryOne, execute, lastInsertId } from '../lib/db'
import { generateToken } from '../lib/crypto'
import type { Env } from '../[[route]]'

export const documentRoutes = new Hono<{ Bindings: Env }>()

const UPLOAD_URL_TTL = 300  // 5 minutes
const DOWNLOAD_URL_TTL = 3600  // 1 hour

documentRoutes.get('/', async (c) => {
  const { entity_type, entity_id, category } = c.req.query()
  let sql = `SELECT d.*, u.full_name as uploaded_by_name FROM documents d
             LEFT JOIN users u ON u.id = d.uploaded_by
             WHERE 1=1`
  const params: unknown[] = []
  if (entity_type) { sql += ' AND d.entity_type = ?'; params.push(entity_type) }
  if (entity_id) { sql += ' AND d.entity_id = ?'; params.push(entity_id) }
  if (category) { sql += ' AND d.category = ?'; params.push(category) }
  sql += ' ORDER BY d.created_at DESC'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

documentRoutes.post(
  '/upload-url',
  zValidator('json', z.object({
    entity_type: z.enum(['project', 'work_order', 'estimate', 'subcontractor', 'client']),
    entity_id: z.number(),
    file_name: z.string().min(1),
    mime_type: z.string().min(1),
    category: z.enum(['plan', 'permit', 'contract', 'photo', 'spec', 'rfi', 'submittal', 'insurance', 'w9', 'other']).optional(),
    description: z.string().optional(),
    compliance_criterion: z.number().int().min(1).max(14).optional(),
  })),
  async (c) => {
    const user = c.get('user')
    const data = c.req.valid('json')

    // Generate a unique R2 object key
    const ext = data.file_name.includes('.') ? data.file_name.split('.').pop() : ''
    const fileKey = `${data.entity_type}/${data.entity_id}/${generateToken(16)}${ext ? '.' + ext : ''}`

    // Create a pending document record
    const result = await execute(c.env.DB,
      `INSERT INTO documents (entity_type, entity_id, file_name, file_key, mime_type, category, description, compliance_criterion, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.entity_type, data.entity_id, data.file_name, fileKey,
      data.mime_type, data.category ?? 'other', data.description ?? null, data.compliance_criterion ?? null, user.sub
    )
    const docId = lastInsertId(result)

    // Generate presigned PUT URL for direct browser upload
    const uploadUrl = await c.env.R2.createMultipartUpload
      ? generateR2PresignedPut(c.env.R2, fileKey, data.mime_type, UPLOAD_URL_TTL)
      : null

    return c.json({
      document_id: docId,
      file_key: fileKey,
      upload_url: uploadUrl,
      // Fallback: client can POST directly to /api/documents/:id/upload if presigned isn't available
    })
  }
)

documentRoutes.put(
  '/:id/confirm',
  zValidator('json', z.object({ file_size: z.number().optional() })),
  async (c) => {
    const { file_size } = c.req.valid('json')
    await execute(c.env.DB,
      'UPDATE documents SET file_size = ? WHERE id = ?',
      file_size ?? null, c.req.param('id')
    )
    return c.json({ ok: true })
  }
)

documentRoutes.get('/:id/url', async (c) => {
  const doc = await queryOne<{ file_key: string; file_name: string; mime_type: string }>(
    c.env.DB, 'SELECT file_key, file_name, mime_type FROM documents WHERE id = ?', c.req.param('id')
  )
  if (!doc) return c.json({ error: 'Not found' }, 404)

  // Generate presigned GET URL
  const url = await generateR2PresignedGet(c.env.R2, doc.file_key, DOWNLOAD_URL_TTL)
  return c.json({ url, file_name: doc.file_name, mime_type: doc.mime_type })
})

documentRoutes.delete('/:id', async (c) => {
  const doc = await queryOne<{ file_key: string }>(
    c.env.DB, 'SELECT file_key FROM documents WHERE id = ?', c.req.param('id')
  )
  if (!doc) return c.json({ error: 'Not found' }, 404)

  // Delete from R2
  try { await c.env.R2.delete(doc.file_key) } catch { /* ignore if not found */ }

  await execute(c.env.DB, 'DELETE FROM documents WHERE id = ?', c.req.param('id'))
  return c.json({ ok: true })
})

// Direct upload fallback (for local dev without presigned URLs)
documentRoutes.post('/:id/upload', async (c) => {
  const doc = await queryOne<{ file_key: string }>(
    c.env.DB, 'SELECT file_key FROM documents WHERE id = ?', c.req.param('id')
  )
  if (!doc) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.raw.arrayBuffer()
  const contentType = c.req.header('Content-Type') ?? 'application/octet-stream'
  await c.env.R2.put(doc.file_key, body, { httpMetadata: { contentType } })

  await execute(c.env.DB,
    'UPDATE documents SET file_size = ? WHERE id = ?',
    body.byteLength, c.req.param('id')
  )
  return c.json({ ok: true })
})

// R2 presigned URL helpers
// Note: Cloudflare R2 supports presigned URLs via the S3-compatible API.
// The Workers R2 binding uses .createPresignedUrl() (if available) or we proxy through a Worker route.

async function generateR2PresignedPut(
  r2: R2Bucket,
  key: string,
  _contentType: string,
  _ttl: number
): Promise<string | null> {
  // Cloudflare R2 Workers binding doesn't expose presigned URL generation natively in all runtimes.
  // Return null to fall back to direct upload endpoint.
  // In production, use the R2 S3-compatible API with presigned URLs via a separate endpoint.
  void r2; void key
  return null
}

async function generateR2PresignedGet(
  r2: R2Bucket,
  key: string,
  _ttl: number
): Promise<string> {
  // For Workers binding, return a proxy URL through our API
  // Production: use R2 public bucket or S3-compatible presigned URL
  void r2; void key
  return `/api/documents/serve/${encodeURIComponent(key)}`
}

// Serve file directly from R2 (for local dev)
documentRoutes.get('/serve/:key{.+}', async (c) => {
  const key = decodeURIComponent(c.req.param('key'))
  const obj = await c.env.R2.get(key)
  if (!obj) return c.json({ error: 'File not found' }, 404)
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('ETag', obj.httpEtag)
  return new Response(obj.body, { headers })
})
