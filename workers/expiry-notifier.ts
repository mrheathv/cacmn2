interface Env {
  DB: D1Database
  RESEND_API_KEY: string
  FROM_EMAIL: string
  INTERNAL_NOTIFY_EMAIL: string
}

interface Sub {
  company_name: string
  contact_name: string | null
  contact_email: string
  license_number: string | null
  license_expiry: string | null
  insurance_carrier: string | null
  insurance_expiry: string | null
}

interface SendResult {
  company: string
  to: string
  items: string[]
  sent: boolean
  error?: string
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`
}

function buildHtml(sub: Sub, expiringItems: { label: string; date: string }[]): string {
  const greeting = sub.contact_name ? `Hi ${sub.contact_name},` : 'Hello,'
  const rows = expiringItems
    .map(
      item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:600;">${formatDate(item.date)}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#1e293b;padding:16px 24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#f59e0b;margin:0;font-size:20px;">Construct-All Corporation</h1>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Subcontractor Certification Notice</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <p>${greeting}</p>
    <p>This is a reminder that the following certification(s) on file for <strong>${sub.company_name}</strong> will expire in <strong>30 days</strong>. Please provide updated documentation to maintain your active status in our system.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Item</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Expires</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Please send updated certificates of insurance or license renewal documents to our office as soon as possible.</p>
    <p>If you have any questions, contact us at <a href="mailto:office@cacmn.com">office@cacmn.com</a> or call (763) 545-3500.</p>
    <p style="margin-top:24px;">Thank you,<br><strong>Construct-All Corporation</strong></p>
  </div>
  <p style="font-size:11px;color:#94a3b8;margin-top:16px;text-align:center;">
    Construct-All Corporation · 9220 Bass Lake Rd #130, New Hope, MN 55428 · cacmn.com
  </p>
</body>
</html>`
}

async function sendEmail(env: Env, to: string, cc: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.FROM_EMAIL, to: [to], cc: [cc], subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

// Core logic shared by the cron handler and the test endpoint.
// toOverride: when set, redirects all emails to this address instead of the real contact_email.
async function runNotifier(env: Env, toOverride?: string): Promise<SendResult[]> {
  const { results } = await env.DB.prepare(`
    SELECT company_name, contact_name, contact_email,
           license_number, license_expiry,
           insurance_carrier, insurance_expiry
    FROM subcontractors
    WHERE status = 'active'
      AND contact_email IS NOT NULL
      AND contact_email != ''
      AND (
        date(license_expiry)    = date('now', '+30 days')
        OR date(insurance_expiry) = date('now', '+30 days')
      )
  `).all<Sub>()

  const target = new Date()
  target.setUTCDate(target.getUTCDate() + 30)
  const targetDate = target.toISOString().slice(0, 10)

  const summary: SendResult[] = []

  for (const sub of results) {
    const expiringItems: { label: string; date: string }[] = []

    if (sub.license_expiry?.slice(0, 10) === targetDate) {
      expiringItems.push({
        label: sub.license_number ? `Contractor License #${sub.license_number}` : 'Contractor License',
        date: sub.license_expiry!.slice(0, 10),
      })
    }

    if (sub.insurance_expiry?.slice(0, 10) === targetDate) {
      expiringItems.push({
        label: sub.insurance_carrier
          ? `Certificate of Insurance (${sub.insurance_carrier})`
          : 'Certificate of Insurance',
        date: sub.insurance_expiry!.slice(0, 10),
      })
    }

    if (expiringItems.length === 0) continue

    const recipient = toOverride ?? sub.contact_email
    const cc = toOverride ?? env.INTERNAL_NOTIFY_EMAIL
    const subject = `Action Required: Certification Expiring in 30 Days — ${sub.company_name}`
    const html = buildHtml(sub, expiringItems)

    const result: SendResult = {
      company: sub.company_name,
      to: recipient,
      items: expiringItems.map(i => `${i.label} (${i.date})`),
      sent: false,
    }

    try {
      await sendEmail(env, recipient, cc, subject, html)
      result.sent = true
    } catch (err) {
      result.error = String(err)
      console.error(`Failed to send to ${recipient} (${sub.company_name}):`, err)
    }

    summary.push(result)
  }

  return summary
}

export default {
  // Cron trigger — runs daily at 9am CT
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runNotifier(env).then(results => {
        const sent = results.filter(r => r.sent).length
        console.log(`Expiry notifier: ${results.length} matches, ${sent} emails sent.`)
      }),
    )
  },

  // HTTP handler — manual test trigger
  // Usage:
  //   curl -H "Authorization: Bearer <RESEND_API_KEY>" \
  //        https://<worker-url>/send-test
  //
  //   # Redirect all emails to yourself instead of real contacts:
  //   curl -H "Authorization: Bearer <RESEND_API_KEY>" \
  //        "https://<worker-url>/send-test?to=you@example.com"
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (url.pathname !== '/send-test') {
      return new Response('Not found', { status: 404 })
    }

    // Require the API key as a bearer token
    const auth = req.headers.get('Authorization') ?? ''
    if (auth !== `Bearer ${env.RESEND_API_KEY}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    const toOverride = url.searchParams.get('to') ?? undefined
    const results = await runNotifier(env, toOverride)

    return Response.json({
      matched: results.length,
      sent: results.filter(r => r.sent).length,
      redirected_to: toOverride ?? null,
      results,
    })
  },
}
