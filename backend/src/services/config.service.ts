import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

/**
 * Legge righe dalla tabella SystemConfig via raw query.
 * Compatibile anche prima di prisma generate.
 */
async function getConfigRows(keys: string[]): Promise<Map<string, string>> {
  try {
    const rows: Array<{ key: string; value: string }> = await prisma.$queryRawUnsafe(
      `SELECT "key", "value" FROM "SystemConfig" WHERE "key" = ANY($1)`,
      keys
    );
    return new Map(rows.map((r: { key: string; value: string }) => [r.key, r.value]));
  } catch {
    // Tabella non ancora creata — restituisci map vuota
    return new Map();
  }
}

/**
 * Legge la configurazione SMTP dal database.
 * Se non configurata, fallback sulle variabili d'ambiente.
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  const map = await getConfigRows(['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'smtp_from']);

  // Se c'è almeno host e user nel DB, usa quelli
  if (map.get('smtp_host') && map.get('smtp_user')) {
    return {
      host: map.get('smtp_host')!,
      port: parseInt(map.get('smtp_port') || '587'),
      secure: map.get('smtp_secure') === 'true',
      user: map.get('smtp_user')!,
      password: map.get('smtp_password') || '',
      from: map.get('smtp_from') || map.get('smtp_user')!,
    };
  }

  // Fallback env
  return {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
  };
}

/**
 * Legge la configurazione IMAP dal database.
 * Se non configurata, fallback sulle variabili d'ambiente.
 */
export async function getImapConfig(): Promise<ImapConfig> {
  const map = await getConfigRows(['imap_host', 'imap_port', 'imap_user', 'imap_password']);

  if (map.get('imap_host') && map.get('imap_user')) {
    return {
      host: map.get('imap_host')!,
      port: parseInt(map.get('imap_port') || '993'),
      user: map.get('imap_user')!,
      password: map.get('imap_password') || '',
    };
  }

  return {
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993'),
    user: process.env.IMAP_USER || process.env.EMAIL_USER || '',
    password: process.env.IMAP_PASSWORD || process.env.EMAIL_PASSWORD || '',
  };
}

/**
 * Salva una o più impostazioni nel database.
 */
export async function setConfig(entries: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SystemConfig" ("key", "value", "updatedAt") VALUES ($1, $2, NOW())
       ON CONFLICT ("key") DO UPDATE SET "value" = $2, "updatedAt" = NOW()`,
      key, value
    );
  }
}

/**
 * Nome azienda (per email template e UI).
 * Legge da DB, poi env, poi default.
 */
export async function getCompanyName(): Promise<string> {
  const map = await getConfigRows(['company_name']);
  return map.get('company_name') || process.env.COMPANY_NAME || 'Kanban ISO';
}

/**
 * Legge tutte le configurazioni email (SMTP + IMAP) — per UI admin.
 * Maschera la password.
 */
export async function getEmailConfigForAdmin(): Promise<Record<string, string>> {
  const smtp = await getSmtpConfig();
  const imap = await getImapConfig();
  const companyName = await getCompanyName();
  return {
    company_name: companyName,
    smtp_host: smtp.host,
    smtp_port: String(smtp.port),
    smtp_secure: String(smtp.secure),
    smtp_user: smtp.user,
    smtp_password: smtp.password ? '••••••••' : '',
    smtp_from: smtp.from,
    imap_host: imap.host,
    imap_port: String(imap.port),
    imap_user: imap.user,
    imap_password: imap.password ? '••••••••' : '',
  };
}
