import { prisma } from '../index';

/**
 * AI Service — Integrazione con Claude API per assistenza intelligente.
 * Usa ANTHROPIC_API_KEY da env o SystemConfig.
 */

const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

async function getApiKey(): Promise<string | null> {
  // Prima prova env
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // Poi prova DB
  try {
    const row: any[] = await prisma.$queryRawUnsafe(
      `SELECT "value" FROM "SystemConfig" WHERE "key" = 'ANTHROPIC_API_KEY' LIMIT 1`
    );
    if (row.length > 0 && row[0].value) return row[0].value;
  } catch { /* tabella non ancora pronta */ }
  return null;
}

async function callClaude(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string | null> {
  const apiKey = await getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Claude API error (${res.status}):`, err);
      return null;
    }

    const data = await res.json() as any;
    return data.content?.[0]?.text || null;
  } catch (err: any) {
    console.error('❌ Claude API call failed:', err.message);
    return null;
  }
}

/**
 * Suggerisci categoria e priorità per un nuovo ticket
 */
export async function suggestCategoryAndPriority(
  title: string,
  description: string
): Promise<{ category: string; priority: string; confidence: number } | null> {
  const categories = [
    'Produzione', 'Qualità', 'Manutenzione', 'Logistica', 'Acquisti',
    'Sicurezza', 'Ambiente', 'IT/Sistemi', 'Amministrazione',
    'Risorse Umane', 'Commerciale', 'R&D/Sviluppo Prodotto', 'Altro',
  ];

  const systemPrompt = `Sei un assistente IT per un'azienda italiana di packaging (cartotecnica).
Analizza la richiesta e suggerisci la categoria più appropriata e la priorità.

Categorie disponibili: ${categories.join(', ')}
Priorità disponibili: LOW, MEDIUM, HIGH, CRITICAL

Rispondi SOLO in formato JSON (nessun altro testo):
{"category": "...", "priority": "...", "confidence": 0.0-1.0, "reasoning": "breve spiegazione in italiano"}`;

  const result = await callClaude(systemPrompt, `Titolo: ${title}\nDescrizione: ${description}`, 256);
  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    return {
      category: parsed.category || 'Altro',
      priority: parsed.priority || 'MEDIUM',
      confidence: parsed.confidence || 0.5,
    };
  } catch {
    return null;
  }
}

/**
 * Suggerisci una risposta per un commento/email su un ticket
 */
export async function suggestResponse(
  ticketTitle: string,
  ticketDescription: string,
  recentComments: { author: string; content: string; isEmail: boolean }[],
  kbArticles?: { title: string; content: string }[]
): Promise<string | null> {
  const commentsText = recentComments
    .slice(-5)
    .map(c => `[${c.isEmail ? 'EMAIL' : 'COMMENTO'} da ${c.author}]: ${c.content}`)
    .join('\n');

  const kbContext = kbArticles && kbArticles.length > 0
    ? `\n\nArticoli Knowledge Base pertinenti:\n${kbArticles.map(a => `- ${a.title}: ${a.content.substring(0, 300)}`).join('\n')}`
    : '';

  const systemPrompt = `Sei un operatore IT di supporto per un'azienda italiana di packaging.
Scrivi una risposta professionale e concisa in italiano per questo ticket.
Se ci sono articoli KB pertinenti, usali come riferimento.
NON inventare soluzioni tecniche specifiche se non hai informazioni sufficienti.
Scrivi solo il testo della risposta, senza virgolette o prefissi.`;

  const userMsg = `Ticket: ${ticketTitle}
Descrizione: ${ticketDescription}
${commentsText ? `\nConversazione:\n${commentsText}` : ''}${kbContext}

Scrivi una risposta appropriata:`;

  return callClaude(systemPrompt, userMsg, 512);
}

/**
 * Cerca ticket duplicati o simili
 */
export async function findDuplicates(
  title: string,
  description: string
): Promise<{ id: string; title: string; similarity: string }[]> {
  // Cerca ticket recenti aperti
  const recentTickets: any[] = await prisma.$queryRawUnsafe(`
    SELECT "id", "title", "description", "status", "priority"
    FROM "Ticket"
    WHERE "status" NOT IN ('CLOSED')
    AND "createdAt" > NOW() - INTERVAL '90 days'
    ORDER BY "createdAt" DESC
    LIMIT 50
  `);

  if (recentTickets.length === 0) return [];

  const ticketList = recentTickets
    .map(t => `[${t.id.substring(0, 8)}] ${t.title} | ${(t.description || '').substring(0, 100)}`)
    .join('\n');

  const systemPrompt = `Sei un assistente che rileva ticket duplicati o molto simili.
Confronta il NUOVO ticket con la lista di ticket esistenti.
Se trovi ticket simili (stesso problema, stessa richiesta), elencali.

Rispondi SOLO in formato JSON array (nessun altro testo):
[{"id": "id-parziale", "similarity": "breve spiegazione"}]
Se non ci sono duplicati, rispondi: []`;

  const result = await callClaude(
    systemPrompt,
    `NUOVO TICKET:\nTitolo: ${title}\nDescrizione: ${description}\n\nTICKET ESISTENTI:\n${ticketList}`,
    512
  );
  if (!result) return [];

  try {
    const parsed = JSON.parse(result);
    if (!Array.isArray(parsed)) return [];

    // Mappa gli ID parziali ai ticket reali
    return parsed.slice(0, 5).map((d: any) => {
      const match = recentTickets.find(t => t.id.startsWith(d.id));
      return match
        ? { id: match.id, title: match.title, similarity: d.similarity || '' }
        : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Suggerisci articoli KB pertinenti per un problema
 */
export async function suggestKBArticles(
  title: string,
  description: string
): Promise<{ id: string; title: string; relevance: string }[]> {
  const articles: any[] = await prisma.$queryRawUnsafe(`
    SELECT "id", "title", "content", "category", "tags"
    FROM "KBArticle"
    WHERE "published" = true
    ORDER BY "helpfulCount" DESC, "viewCount" DESC
    LIMIT 30
  `);

  if (articles.length === 0) return [];

  const articleList = articles
    .map(a => `[${a.id.substring(0, 8)}] [${a.category}] ${a.title} | ${(a.content || '').substring(0, 150)}`)
    .join('\n');

  const systemPrompt = `Sei un assistente che suggerisce articoli della Knowledge Base pertinenti.
Confronta il problema descritto con gli articoli disponibili.
Suggerisci quelli più utili per risolvere il problema.

Rispondi SOLO in formato JSON array:
[{"id": "id-parziale", "relevance": "breve spiegazione"}]
Se nessun articolo è pertinente, rispondi: []`;

  const result = await callClaude(
    systemPrompt,
    `PROBLEMA:\nTitolo: ${title}\nDescrizione: ${description}\n\nARTICOLI KB:\n${articleList}`,
    512
  );
  if (!result) return [];

  try {
    const parsed = JSON.parse(result);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 5).map((s: any) => {
      const match = articles.find(a => a.id.startsWith(s.id));
      return match
        ? { id: match.id, title: match.title, relevance: s.relevance || '' }
        : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Verifica se l'AI è configurata
 */
export async function isAIConfigured(): Promise<boolean> {
  const key = await getApiKey();
  return !!key;
}
