import { Hono } from 'hono'
import { queryOne, queryAll } from '../lib/db'
import type { Env } from '../[[route]]'

export const dashboardRoutes = new Hono<{ Bindings: Env }>()

dashboardRoutes.get('/stats', async (c) => {
  const [activeProjects, openEstimatesValue, openWOs, myTasksDue, projectsByStatus, subsExpiring] =
    await Promise.all([
      queryOne<{ count: number }>(c.env.DB,
        `SELECT COUNT(*) as count FROM projects WHERE status IN ('planning','bidding','awarded','active','punch_list')`
      ),
      queryOne<{ total: number; count: number }>(c.env.DB,
        `SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count FROM estimates WHERE status IN ('draft','sent','under_review')`
      ),
      queryOne<{ count: number }>(c.env.DB,
        `SELECT COUNT(*) as count FROM work_orders WHERE status IN ('draft','issued','in_progress','pending_approval')`
      ),
      queryOne<{ count: number }>(c.env.DB,
        `SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status != 'done' AND due_date <= date('now','+7 days')`,
        c.get('user').sub
      ),
      queryAll<{ status: string; count: number }>(c.env.DB,
        `SELECT status, COUNT(*) as count FROM projects GROUP BY status`
      ),
      queryOne<{ count: number }>(c.env.DB,
        `SELECT COUNT(*) as count FROM subcontractors WHERE (insurance_expiry <= date('now','+30 days') OR license_expiry <= date('now','+30 days')) AND status = 'active'`
      ),
    ])

  return c.json({
    active_projects: activeProjects?.count ?? 0,
    open_estimates: { count: openEstimatesValue?.count ?? 0, total_value: openEstimatesValue?.total ?? 0 },
    open_work_orders: openWOs?.count ?? 0,
    my_tasks_due: myTasksDue?.count ?? 0,
    projects_by_status: projectsByStatus,
    subs_expiring: subsExpiring?.count ?? 0,
  })
})

dashboardRoutes.get('/activity', async (c) => {
  // Cross-entity recent activity feed (last 20 items)
  const recent = await queryAll(c.env.DB,
    `SELECT 'project' as type, id, name as title, status, created_at FROM projects
     UNION ALL
     SELECT 'estimate' as type, id, title, status, created_at FROM estimates
     UNION ALL
     SELECT 'work_order' as type, id, title, status, created_at FROM work_orders
     ORDER BY created_at DESC LIMIT 20`
  )
  return c.json(recent)
})

dashboardRoutes.get('/tasks-due', async (c) => {
  const user = c.get('user')
  const tasks = await queryAll(c.env.DB,
    `SELECT t.*, p.project_number, p.name as project_name
     FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
     WHERE t.assigned_to = ? AND t.status != 'done' AND t.due_date IS NOT NULL
       AND t.due_date <= date('now','+7 days')
     ORDER BY t.due_date`,
    user.sub
  )
  return c.json(tasks)
})
