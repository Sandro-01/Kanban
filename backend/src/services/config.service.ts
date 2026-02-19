import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Chiavi per la configurazione SMTP
const SMTP_KEYS = [
  'smtp_host',
  'smtp_port',
  'smtp_secure',
  'smtp_user',
  'smtp_password',
  'smtp_from',
  'imap_host',
  'imap_port',
  'imap_user',
  'imap_password',
] as const;

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
 * Legge la configurazione SMTP dal database.
 * Se non configurata, fallback sulle variabili d'ambiente.
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'smtp_from'] } },
    });
    const map = new Map(rows.map(r => [r.key, r.value]));

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
  } catch {
    // Tabella non ancora creata — usa env
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
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { in: ['imap_host', 'imap_port', 'imap_user', 'imap_password'] } },
    });
    const map = new Map(rows.map(r => [r.key, r.value]));

    if (map.get('imap_host') && map.get('imap_user')) {
      return {
        host: map.get('imap_host')!,
        port: parseInt(map.get('imap_port') || '993'),
        user: map.get('imap_user')!,
        password: map.get('imap_password') || '',
      };
    }
  } catch {
    // Fallback env
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
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

/**
 * Legge tutte le configurazioni email (SMTP + IMAP) — per UI admin.
 * Maschera la password.
 */
export async function getEmailConfigForAdmin(): Promise<Record<string, string>> {
  const smtp = await getSmtpConfig();
  const imap = await getImapConfig();
  return {
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
