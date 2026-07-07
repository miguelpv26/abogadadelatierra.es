/**
 * POST /api/contact — Abogada de la Tierra contact-form handler.
 *
 * Receives the contact form (as FormData), validates it, and emails the
 * message to Lucía via Resend. Nothing is stored: the message is relayed and
 * then discarded by this function.
 *
 * ── Routing ────────────────────────────────────────────────────────────────
 * Cloudflare Pages auto-routes this file to /api/contact by its path. No
 * wrangler.toml or config is needed — BUT this file must be included in the
 * deployment (it is a runtime artifact, unlike package.json or /scripts/).
 *
 * ── Required environment variables (set in the Pages dashboard) ────────────
 *   RESEND_API_KEY  (secret)  — your Resend API key (starts with "re_")
 *   CONTACT_TO      (plain)   — destination inbox, e.g. lrg.administrativo@gmail.com
 * Optional:
 *   CONTACT_FROM    (plain)   — verified sender; default below
 *
 * See CONTACT_FORM_SETUP.md for the full setup (Resend account + DNS records).
 */

const SUBJECTS = {
  urbanismo: 'Urbanismo / Suelo rústico',
  licencias: 'Licencias y permisos',
  expropiaciones: 'Expropiaciones',
  sanciones: 'Sanciones / Expediente sancionador',
  administrativo: 'Otro tema administrativo',
  otro: 'Otro'
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })

// 303 redirect — used for plain (no-JS) browser form posts, so the visitor lands
// on a real page instead of seeing raw JSON.
const seeOther = location =>
  new Response(null, { status: 303, headers: { Location: location } })

const escapeHtml = (s = '') =>
  s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Health check: a browser GET confirms the function is deployed and routing.
// (The form uses POST; this just makes the endpoint easy to verify.)
export const onRequestGet = () =>
  json({ ok: true, endpoint: 'contact', hint: 'Usa POST (el formulario) para enviar una consulta.' })

export async function onRequestPost ({ request, env }) {
  // The progressive-enhancement fetch() sends "Accept: application/json".
  // A plain browser form post (JS disabled/failed) does not — for those we
  // redirect to real pages instead of returning a JSON body.
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json')
  const ok = () => wantsJson ? json({ ok: true }) : seeOther('/gracias')
  const fail = (error, status) =>
    wantsJson ? json({ ok: false, error }, status) : seeOther('/#contacto')

  let form
  try {
    form = await request.formData()
  } catch {
    return fail('bad_request', 400)
  }

  // Honeypot: humans never see the "company" field. If it's filled, it's a bot.
  // Pretend success (no JSON error) but send nothing.
  if ((form.get('company') || '').toString().trim() !== '') {
    return ok()
  }

  const name = (form.get('name') || '').toString().trim()
  const email = (form.get('email') || '').toString().trim()
  const phone = (form.get('phone') || '').toString().trim()
  const subjectKey = (form.get('subject') || '').toString().trim()
  const message = (form.get('message') || '').toString().trim()
  const privacy = form.get('privacy')

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (name.length < 2 || !emailOk || message.length < 10 || !subjectKey || !privacy) {
    return fail('validation', 422)
  }

  if (!env.RESEND_API_KEY) {
    return fail('not_configured', 500)
  }

  const subjectLabel = SUBJECTS[subjectKey] || subjectKey
  const to = env.CONTACT_TO || 'lrg.administrativo@gmail.com'
  const from = env.CONTACT_FROM || 'Abogada de la Tierra <no-reply@abogadadelatierra.es>'

  const text = [
    `Nombre: ${name}`,
    `Email: ${email}`,
    phone ? `Teléfono: ${phone}` : null,
    `Tipo de consulta: ${subjectLabel}`,
    '',
    'Mensaje:',
    message
  ].filter(l => l !== null).join('\n')

  const html =
    '<h2>Nueva consulta desde abogadadelatierra.es</h2>' +
    `<p><strong>Nombre:</strong> ${escapeHtml(name)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    (phone ? `<strong>Teléfono:</strong> ${escapeHtml(phone)}<br>` : '') +
    `<strong>Tipo de consulta:</strong> ${escapeHtml(subjectLabel)}</p>` +
    `<p><strong>Mensaje:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`

  let resendRes
  try {
    resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Consulta web — ${subjectLabel} — ${name}`,
        text,
        html
      })
    })
  } catch {
    return fail('network', 502)
  }

  if (!resendRes.ok) {
    return fail('send_failed', 502)
  }

  return ok()
}
