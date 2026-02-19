/**
 * Template email professionale condiviso per tutte le notifiche del sistema.
 * Stile aziendale moderno, compatibile con Outlook, Gmail e Apple Mail.
 */

export interface EmailTemplateOptions {
  /** Nome azienda (header + footer) */
  companyName: string;
  /** Titolo principale nell'header (es. "Richiesta ricevuta") */
  heading: string;
  /** Sottotitolo (es. "Ticket #abc12345") */
  subheading?: string;
  /** Colore accento (default: #2563eb) */
  accentColor?: string;
  /** Contenuto HTML del corpo email */
  body: string;
  /** Testo footer aggiuntivo (es. "Ref: #abc12345") */
  footerRef?: string;
}

/**
 * Genera l'HTML completo di una email professionale.
 */
export function buildEmailHtml(opts: EmailTemplateOptions): string {
  const accent = opts.accentColor || '#2563eb';

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

  <!-- TOP ACCENT BAR -->
  <tr>
    <td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td>
  </tr>

  <!-- HEADER -->
  <tr>
    <td style="padding:28px 32px 20px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${accent};text-transform:uppercase;letter-spacing:0.8px;">${escapeHtml(opts.companyName)}</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${escapeHtml(opts.heading)}</h1>
            ${opts.subheading ? `<p style="margin:6px 0 0;font-size:13px;color:#64748b;">${escapeHtml(opts.subheading)}</p>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- DIVIDER -->
  <tr>
    <td style="padding:0 32px;">
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;">
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="padding:24px 32px 28px 32px;font-size:14px;color:#334155;line-height:1.6;">
      ${opts.body}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">${escapeHtml(opts.companyName)} &mdash; Assistenza IT</p>
      ${opts.footerRef ? `<p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;text-align:center;">${escapeHtml(opts.footerRef)}</p>` : ''}
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ───── Helper: blocco informazioni (tabella chiave-valore) ───── */

export function infoTable(rows: { label: string; value: string; highlight?: boolean }[]): string {
  const rowsHtml = rows.map((r, i) => {
    const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
    const valStyle = r.highlight
      ? 'display:inline-block;padding:2px 10px;border-radius:12px;background:#eff6ff;color:#2563eb;font-weight:600;font-size:12px;'
      : 'color:#0f172a;';
    return `<tr>
      <td style="padding:10px 14px;background:${bg};border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:130px;vertical-align:top;">${escapeHtml(r.label)}</td>
      <td style="padding:10px 14px;background:${bg};border-bottom:1px solid #f1f5f9;font-size:13px;"><span style="${valStyle}">${escapeHtml(r.value)}</span></td>
    </tr>`;
  }).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">${rowsHtml}</table>`;
}

/* ───── Helper: blocco messaggio / commento ───── */

export function messageBlock(text: string, opts?: { author?: string; accentColor?: string }): string {
  const accent = opts?.accentColor || '#2563eb';
  return `<div style="background:#f8fafc;padding:16px 18px;border-radius:8px;border-left:4px solid ${accent};margin-bottom:16px;">
    ${opts?.author ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${accent};">${escapeHtml(opts.author)}</p>` : ''}
    <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">${escapeHtml(text)}</p>
  </div>`;
}

/* ───── Helper: blocco allegati ───── */

export function attachmentsList(fileNames: string[]): string {
  if (fileNames.length === 0) return '';
  const items = fileNames.map(n =>
    `<tr><td style="padding:4px 0;font-size:13px;color:#334155;">&#128206;&ensp;${escapeHtml(n)}</td></tr>`
  ).join('');
  return `<div style="margin-top:16px;padding:14px 16px;background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#475569;">Allegati (${fileNames.length})</p>
    <table role="presentation" cellpadding="0" cellspacing="0">${items}</table>
  </div>`;
}

/* ───── Helper: call-to-action / info box ───── */

export function callToAction(text: string, accentColor?: string): string {
  const accent = accentColor || '#2563eb';
  return `<div style="background:#eff6ff;border-left:4px solid ${accent};padding:12px 16px;border-radius:0 8px 8px 0;margin-top:20px;">
    <p style="margin:0;font-size:13px;color:#1e40af;">${text}</p>
  </div>`;
}

/* ───── Helper: badge priorità ───── */

export function priorityBadge(priority: string): string {
  const colors: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#f59e0b',
    MEDIUM: '#2563eb',
    LOW: '#22c55e',
  };
  const labels: Record<string, string> = {
    CRITICAL: 'Critica',
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Bassa',
  };
  const c = colors[priority] || '#2563eb';
  const l = labels[priority] || priority;
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${c}18;color:${c};font-weight:600;font-size:12px;border:1px solid ${c}30;">${l}</span>`;
}

/* ───── Utility ───── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
