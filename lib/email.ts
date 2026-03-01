/**
 * lib/email.ts
 *
 * Centrale e-mailwrapper via Resend.
 * Fire-and-forget: gooit nooit errors naar de caller.
 *
 * Setup:
 *   1. npm install resend
 *   2. RESEND_API_KEY=re_... in .env.local
 *   3. RESEND_FROM=noreply@jouwnexsolve.nl in .env.local
 */

// Resend via require() zodat TypeScript geen module-check doet bij compilatie.
// Werkt zodra 'npm install resend' is uitgevoerd; faalt graceful als het ontbreekt.
async function getResend() {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key) return null
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resend } = require('resend') as typeof import('resend')
    return new Resend(key)
  } catch {
    return null
  }
}

const FROM = process.env.RESEND_FROM ?? 'NexSolve <noreply@nexsolve.nl>'

// ─── Template types ───────────────────────────────────────────

export interface ProjectInviteEmail {
  type: 'project_invite'
  to: string
  recipientName: string
  inviterName: string
  projectName: string
  projectUrl: string
  role: string
}

export interface DeadlineReminderEmail {
  type: 'deadline_reminder'
  to: string
  recipientName: string
  projectName: string
  projectUrl: string
  daysLeft: number
  endDate: string
}

export interface WeeklyDigestEmail {
  type: 'weekly_digest'
  to: string
  recipientName: string
  weekLabel: string
  activities: Array<{ action: string; entityName: string; actorName: string; when: string }>
  projectCount: number
  hoursLogged: number
}

export interface IntakeRequestEmail {
  type:        'intake_request'
  to:          string
  projectName: string
  projectCode?: string
  senderName:  string
  intakeId:    string
}


export interface OrgInviteEmail {
  type:          'org_invite'
  to:            string
  recipientName: string
  inviterName:   string
  orgName:       string
  acceptUrl:     string
}

export type EmailPayload =
  | ProjectInviteEmail
  | DeadlineReminderEmail
  | WeeklyDigestEmail
  | IntakeRequestEmail
  | OrgInviteEmail

// ─── Status labels ────────────────────────────────────────────

const STATUS_NL: Record<string, string> = {
  active:       'Actief',
  'in-progress':'In uitvoering',
  archived:     'Gearchiveerd',
}

// ─── HTML builder ─────────────────────────────────────────────
// Simpele maar professioneel uitziende HTML-e-mails zonder extra pakket.

function baseLayout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NexSolve</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#0a6645;border-radius:16px 16px 0 0;padding:24px 32px;">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">NexSolve</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f1f5f9;border-radius:0 0 16px 16px;padding:16px 32px;border:1px solid #e2e8f0;border-top:none;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Je ontvangt deze e-mail omdat je lid bent van NexSolve.<br/>
              <a href="#" style="color:#64748b;text-decoration:underline;">Uitschrijven</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#0a6645;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;margin-top:24px;">${label}</a>`
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">${text}</h1>`
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">${text}</p>`
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;background:${color}22;color:${color};padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;">${text}</span>`
}

function metaRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#94a3b8;width:130px;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#334155;font-weight:500;">${value}</td>
  </tr>`
}

// ─── Template builders ────────────────────────────────────────

function buildProjectInvite(data: ProjectInviteEmail) {
  const content = `
    ${h1(`Je bent uitgenodigd voor een project`)}
    ${p(`Hoi ${data.recipientName},`)}
    ${p(`<strong>${data.inviterName}</strong> heeft je toegevoegd aan het project <strong>${data.projectName}</strong> als <strong>${data.role}</strong>.`)}
    <table cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:100%;">
      ${metaRow('Project', data.projectName)}
      ${metaRow('Jouw rol', data.role)}
      ${metaRow('Uitgenodigd door', data.inviterName)}
    </table>
    ${p('Klik hieronder om het project te openen:')}
    ${btn(data.projectUrl, 'Project openen →')}
  `
  return {
    subject: `Je bent uitgenodigd: ${data.projectName}`,
    html: baseLayout(content, `${data.inviterName} heeft je uitgenodigd voor ${data.projectName}`),
  }
}

function buildDeadlineReminder(data: DeadlineReminderEmail) {
  const urgentColor = data.daysLeft <= 3 ? '#ef4444' : data.daysLeft <= 7 ? '#f59e0b' : '#64748b'
  const content = `
    ${h1(`Deadline herinnering`)}
    ${p(`Hoi ${data.recipientName},`)}
    ${p(`De deadline voor <strong>${data.projectName}</strong> nadert.`)}
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:20px 0;text-align:center;">
      <div style="font-size:32px;font-weight:800;color:${urgentColor};">${data.daysLeft === 0 ? 'Vandaag!' : `${data.daysLeft} dag${data.daysLeft !== 1 ? 'en' : ''}`}</div>
      <div style="font-size:13px;color:#92400e;margin-top:4px;">Deadline: ${data.endDate}</div>
    </div>
    ${btn(data.projectUrl, 'Project openen →')}
  `
  return {
    subject: `⏰ Deadline over ${data.daysLeft} dag${data.daysLeft !== 1 ? 'en' : ''}: ${data.projectName}`,
    html: baseLayout(content),
  }
}

function buildWeeklyDigest(data: WeeklyDigestEmail) {
  const activityRows = data.activities.slice(0, 10).map(a =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">${a.entityName}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">${a.action}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;">${a.when}</td>
    </tr>`
  ).join('')

  const content = `
    ${h1(`Jouw weekoverzicht`)}
    ${p(`Hoi ${data.recipientName}, hier is een samenvatting van ${data.weekLabel}.`)}
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;">
      <tr>
        <td style="text-align:center;padding:16px;background:#f0fdf4;border-radius:12px;width:50%;">
          <div style="font-size:28px;font-weight:800;color:#0a6645;">${data.projectCount}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">actieve projecten</div>
        </td>
        <td style="width:16px;"></td>
        <td style="text-align:center;padding:16px;background:#eff6ff;border-radius:12px;width:50%;">
          <div style="font-size:28px;font-weight:800;color:#2563eb;">${data.hoursLogged}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">uur geregistreerd</div>
        </td>
      </tr>
    </table>
    ${data.activities.length > 0 ? `
      <p style="margin:24px 0 12px;font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Recente activiteit</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${activityRows}
      </table>
    ` : ''}
    ${btn(process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.nexsolve.nl', 'Dashboard openen →')}
  `
  return {
    subject: `Jouw weekoverzicht — ${data.weekLabel}`,
    html: baseLayout(content),
  }
}

function buildIntakeRequest(data: IntakeRequestEmail) {
  const codeLabel = data.projectCode ? ` (${data.projectCode})` : ''
  const content = `
    ${h1('Intake vragenlijst')}
    ${p(`Beste relatie,`)}
    ${p(`${data.senderName} heeft een intake vragenlijst voor u klaargemaakt in verband met het project <strong>${data.projectName}${codeLabel}</strong>.`)}
    ${p('Om uw project goed te kunnen voorbereiden, vragen wij u de bijgevoegde vragenlijst zo volledig mogelijk in te vullen en deze ingevuld te retourneren.')}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">📋 Wat te doen:</p>
      <ol style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#166534;line-height:1.8;">
        <li>Download de bijgevoegde PDF vragenlijst</li>
        <li>Vul de vragen zo volledig mogelijk in</li>
        <li>Stuur het ingevulde document terug per e-mail</li>
      </ol>
    </div>
    ${p('Heeft u vragen over de vragenlijst? Neem dan gerust contact op met uw projectcontact.')}
    ${p(`Met vriendelijke groet,<br/><strong>${data.senderName}</strong>`)}
  `
  return {
    subject: `Intake vragenlijst — ${data.projectName}`,
    html: baseLayout(content, `Intake vragenlijst voor ${data.projectName}`),
  }
}


// ─── Org Invite ───────────────────────────────────────────────

function buildOrgInvite(p: OrgInviteEmail): { subject: string; html: string } {
  return {
    subject: `Uitnodiging voor ${p.orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <div style="background:#0A6645;border-radius:12px;padding:24px;margin-bottom:24px">
          <h1 style="color:white;font-size:22px;margin:0">Je bent uitgenodigd</h1>
          <p style="color:#a8d5be;margin:8px 0 0;font-size:14px">voor ${p.orgName}</p>
        </div>
        <p style="color:#374151;font-size:15px">Hoi ${p.recipientName},</p>
        <p style="color:#374151;font-size:15px">
          <strong>${p.inviterName}</strong> heeft je uitgenodigd om lid te worden van
          <strong>${p.orgName}</strong> in NexSolve.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${p.acceptUrl}"
             style="background:#0A6645;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
            Uitnodiging accepteren
          </a>
        </div>
        <p style="color:#6B7280;font-size:13px">
          Als je geen account hebt, word je gevraagd er één aan te maken.
          De link is 7 dagen geldig.
        </p>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
        <p style="color:#9CA3AF;font-size:12px;text-align:center">NexSolve · Projectbeheer voor professionals</p>
      </div>
    `,
  }
}

// ─── Main sendEmail function ──────────────────────────────────

export async function sendEmail(payload: EmailPayload): Promise<void> {
  // Graceful no-op als Resend niet geconfigureerd is
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY niet ingesteld — e-mail overgeslagen:', payload.type, payload.to)
    return
  }

  try {
    const resend = await getResend()
    if (!resend) return

    let subject: string
    let html: string

    switch (payload.type) {
      case 'project_invite':    ({ subject, html } = buildProjectInvite(payload));    break
      case 'deadline_reminder': ({ subject, html } = buildDeadlineReminder(payload)); break
      case 'weekly_digest':     ({ subject, html } = buildWeeklyDigest(payload));     break
      case 'intake_request':    ({ subject, html } = buildIntakeRequest(payload));    break
      case 'org_invite':         ({ subject, html } = buildOrgInvite(payload));         break
    }

    const { error } = await resend.emails.send({ from: FROM, to: payload.to, subject, html })
    if (error) console.error('[email] Resend error:', error)
    else       console.log(`[email] Verzonden: ${payload.type} → ${payload.to}`)
  } catch (err) {
    // Nooit laten crashen naar de caller
    console.error('[email] Onverwachte fout:', err)
  }
}

// ─── Batch helper ─────────────────────────────────────────────

export async function sendEmailBatch(payloads: EmailPayload[]): Promise<void> {
  await Promise.allSettled(payloads.map(sendEmail))
}
