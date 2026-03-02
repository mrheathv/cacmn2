import type { D1Database } from '@cloudflare/workers-types'

/** Run a SELECT and return all rows */
export async function queryAll<T>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const stmt = db.prepare(sql)
  const result = await stmt.bind(...params).all<T>()
  return result.results ?? []
}

/** Run a SELECT and return the first row or null */
export async function queryOne<T>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const stmt = db.prepare(sql)
  const result = await stmt.bind(...params).first<T>()
  return result ?? null
}

/** Run an INSERT/UPDATE/DELETE */
export async function execute(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<D1Result> {
  return db.prepare(sql).bind(...params).run()
}

/** Get the last inserted row id */
export function lastInsertId(result: D1Result): number {
  return (result.meta as { last_row_id?: number }).last_row_id ?? 0
}

/** Generate a sequential number string like CAC-2024-001 */
export async function generateNumber(
  db: D1Database,
  table: string,
  column: string,
  prefix: string
): Promise<string> {
  const year = new Date().getFullYear()
  const pattern = `${prefix}-${year}-%`
  const row = await queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM ${table} WHERE ${column} LIKE ?`,
    pattern
  )
  const next = ((row?.count ?? 0) + 1).toString().padStart(3, '0')
  return `${prefix}-${year}-${next}`
}

type D1Result = {
  success: boolean
  meta: unknown
  results?: unknown[]
}
