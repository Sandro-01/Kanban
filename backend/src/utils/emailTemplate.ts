/**
 * Email template — Off-White design system.
 * Black / #F5F5F0 / #FFE600. Sharp edges, uppercase labels.
 * Compatible with Outlook, Gmail, Apple Mail.
 */

export interface EmailTemplateOptions {
  companyName: string;
  logoUrl?: string | null;
  heading: string;
  subheading?: string;
  accentColor?: string; // kept for API compatibility, ignored
  body: string;
  footerRef?: string;
}

export function buildEmailHtml(opts: EmailTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#E8E8E0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E8E8E0;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;">

  <!-- TOP BARS: 4px black + 3px yellow -->
  <tr>
    <td style="font-size:0;line-height:0;padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:4px;background:#000000;font-size:0;">&nbsp;</td></tr>
        <tr><td style="height:3px;background:#FFE600;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <!-- HEADER -->
  <tr>
    <td style="padding:36px 40px 28px 40px;background:#FFFFFF;">
      <p style="margin:0 0 20px;font-size:10px;font-weight:800;color:#888888;text-transform:uppercase;letter-spacing:3px;">${escapeHtml(opts.companyName)}</p>
      <h1 style="margin:0 0 14px;font-size:28px;font-weight:900;color:#000000;line-height:1.1;text-transform:uppercase;letter-spacing:-0.5px;">${escapeHtml(opts.heading)}</h1>
      ${opts.subheading ? `
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#FFE600;padding:4px 12px;">
            <span style="font-size:10px;font-weight:800;color:#000000;text-transform:uppercase;letter-spacing:1.5px;">${escapeHtml(opts.subheading)}</span>
          </td>
        </tr>
      </table>` : ''}
    </td>
  </tr>

  <!-- HEADER / BODY DIVIDER -->
  <tr>
    <td style="padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:1px;background:#000000;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="padding:32px 40px 36px 40px;font-size:14px;color:#000000;line-height:1.75;background:#FFFFFF;">
      ${opts.body}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:1px;background:#000000;font-size:0;">&nbsp;</td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 40px;background-color:#F5F5F0;text-align:center;">
            ${opts.logoUrl
              ? `<img src="${opts.logoUrl}" alt="${escapeHtml(opts.companyName)}" width="110" style="width:110px;max-width:110px;max-height:44px;height:auto;display:inline-block;border:0;margin-bottom:10px;" />`
              : `<p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#000000;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(opts.companyName)}</p>`
            }
            ${opts.footerRef
              ? `<p style="margin:0;font-size:10px;color:#888888;text-transform:uppercase;letter-spacing:1.5px;">${escapeHtml(opts.footerRef)}</p>`
              : ''
            }
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ───── Info table ───── */

export function infoTable(rows: { label: string; value: string; highlight?: boolean }[]): string {
  const rowsHtml = rows.map((r) => {
    const valStyle = r.highlight
      ? 'display:inline-block;padding:2px 10px;background:#FFE600;color:#000000;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;'
      : 'color:#000000;font-size:13px;font-weight:600;';
    return `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #E8E8E0;font-size:9px;font-weight:800;color:#888888;text-transform:uppercase;letter-spacing:2px;width:120px;vertical-align:middle;white-space:nowrap;">${escapeHtml(r.label)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E8E8E0;vertical-align:middle;"><span style="${valStyle}">${escapeHtml(r.value)}</span></td>
    </tr>`;
  }).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;margin-bottom:24px;">${rowsHtml}</table>`;
}

/* ───── Message / comment block ───── */

export function messageBlock(html: string, opts?: { author?: string; accentColor?: string }): string {
  return `<div style="background:#F5F5F0;padding:18px 20px;border-left:4px solid #000000;margin-bottom:20px;">
    ${opts?.author
      ? `<p style="margin:0 0 10px;font-size:9px;font-weight:800;color:#000000;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #D8D8D0;padding-bottom:8px;">${escapeHtml(opts.author)}</p>`
      : ''}
    <div style="margin:0;font-size:14px;color:#000000;line-height:1.75;word-wrap:break-word;">${html}</div>
  </div>`;
}

/* ───── Sanitise editor HTML ───── */

export function sanitizeHtmlForEmail(html: string): string {
  let out = html;
  out = out.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<\/?(p|div|h[1-6]|blockquote|section|article|header|footer|main|aside)[^>]*>/gi, '<br>');
  out = out.replace(/<br\s*\/?>/gi, '<br>');
  const safeTags = ['b', 'strong', 'em', 'i', 'u', 's', 'strike', 'code', 'pre', 'ul', 'ol', 'li'];
  out = out.replace(/<(\/?)([a-z][a-z0-9]*)([^>]*)>/gi, (match, slash, tag, attrs) => {
    const t = tag.toLowerCase();
    if (t === 'br') return '<br>';
    if (safeTags.includes(t)) return `<${slash}${t}>`;
    if (t === 'a') {
      if (slash) return '</a>';
      const hrefMatch = attrs.match(/href="([^"]+)"/i);
      if (hrefMatch && /^https?:\/\//i.test(hrefMatch[1])) {
        return `<a href="${hrefMatch[1]}" style="color:#000000;text-decoration:underline;font-weight:700;">`;
      }
      return '';
    }
    return '';
  });
  out = out.replace(/(<br>\s*){3,}/gi, '<br><br>');
  out = out.trim().replace(/^(<br>)+/, '').replace(/(<br>)+$/, '');
  return out;
}

/* ───── Attachments list ───── */

export function attachmentsList(fileNames: string[]): string {
  if (fileNames.length === 0) return '';
  const items = fileNames.map(n =>
    `<tr><td style="padding:7px 0;font-size:12px;color:#000000;border-bottom:1px solid #E8E8E0;">&#8212;&ensp;${escapeHtml(n)}</td></tr>`
  ).join('');
  return `<div style="margin:0 0 20px;padding:14px 18px;background:#F5F5F0;border:1px solid #000000;">
    <p style="margin:0 0 10px;font-size:9px;font-weight:800;color:#000000;text-transform:uppercase;letter-spacing:2px;">Allegati &mdash; ${fileNames.length}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items}</table>
  </div>`;
}

/* ───── Call-to-action ───── */

export function callToAction(text: string, accentColor?: string): string {
  return `<div style="background:#FFE600;padding:14px 20px;margin-top:8px;">
    <p style="margin:0;font-size:13px;color:#000000;line-height:1.5;">${text}</p>
  </div>`;
}

/* ───── Priority badge ───── */

export function priorityBadge(priority: string): string {
  const styles: Record<string, string> = {
    CRITICAL: 'background:#000000;color:#FFE600;',
    HIGH:     'background:#000000;color:#FFFFFF;',
    MEDIUM:   'background:#FFE600;color:#000000;',
    LOW:      'background:#E8E8E0;color:#000000;',
  };
  const labels: Record<string, string> = {
    CRITICAL: 'Critica', HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Bassa',
  };
  const s = styles[priority] || styles.MEDIUM;
  const l = labels[priority] || priority;
  return `<span style="display:inline-block;padding:3px 12px;${s}font-weight:800;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">${l}</span>`;
}

/* ───── Utility ───── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
