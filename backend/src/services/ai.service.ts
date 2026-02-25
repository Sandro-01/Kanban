import { prisma } from '../index';

/**
 * AI Service — Supporta Groq (gratuito) e Anthropic Claude.
 * Priorità: GROQ_API_KEY → ANTHROPIC_API_KEY (env o SystemConfig DB)
 *
 * Groq gratuito: https://console.groq.com  (14.400 req/giorno)
 * Anthropic:     https://console.anthropic.com
 */

// ── Groq (OpenAI-compatible) ─────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';  // modello gratuito più capace

// ── Anthropic ────────────────────────────────────────────────────────────────
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-sonnet-4-5-20250929';

// ── Helpers per leggere le chiavi (env → DB) ──────────────────────────────────
async function getKeyFromDB(key: string): Promise<string | null> {
  try {
    const row: any[] = await prisma.$queryRawUnsafe(
      `SELECT "value" FROM "SystemConfig" WHERE "key" = $1 LIMIT 1`, key
    );
    return row.length > 0 && row[0].value ? row[0].value : null;
  } catch { return null; }
}

async function getGroqKey(): Promise<string | null> {
  return process.env.GROQ_API_KEY || await getKeyFromDB('GROQ_API_KEY');
}

async function getAnthropicKey(): Promise<string | null> {
  return process.env.ANTHROPIC_API_KEY || await getKeyFromDB('ANTHROPIC_API_KEY');
}

// ── Chiamata Groq ─────────────────────────────────────────────────────────────
async function callGroq(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string | null> {
  const apiKey = await getGroqKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Groq API error (${res.status}):`, err);
      return null;
    }

    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    console.error('❌ Groq API call failed:', err.message);
    return null;
  }
}

// ── Chiamata Anthropic ────────────────────────────────────────────────────────
async function callAnthropic(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string | null> {
  const apiKey = await getAnthropicKey();
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
      console.error(`❌ Anthropic API error (${res.status}):`, err);
      return null;
    }

    const data = await res.json() as any;
    return data.content?.[0]?.text || null;
  } catch (err: any) {
    console.error('❌ Anthropic API call failed:', err.message);
    return null;
  }
}

// ── Router principale: Groq → Anthropic ──────────────────────────────────────
async function callAI(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string | null> {
  // Prova Groq (gratuito) per primo
  const groqResult = await callGroq(systemPrompt, userMessage, maxTokens);
  if (groqResult !== null) return groqResult;

  // Fallback Anthropic
  return callAnthropic(systemPrompt, userMessage, maxTokens);
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

  const result = await callAI(systemPrompt, `Titolo: ${title}\nDescrizione: ${description}`, 256);
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

  return callAI(systemPrompt, userMsg, 512);
}

/**
 * Cerca ticket duplicati o simili
 */
export async function findDuplicates(
  title: string,
  description: string
): Promise<{ id: string; title: string; similarity: string }[]> {
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

  const result = await callAI(
    systemPrompt,
    `NUOVO TICKET:\nTitolo: ${title}\nDescrizione: ${description}\n\nTICKET ESISTENTI:\n${ticketList}`,
    512
  );
  if (!result) return [];

  try {
    const parsed = JSON.parse(result);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 5).map((d: any) => {
      const match = recentTickets.find(t => t.id.startsWith(d.id));
      return match
        ? { id: match.id, title: match.title, similarity: d.similarity || '' }
        : null;
    }).filter((x): x is { id: string; title: string; similarity: string } => x !== null);
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

  const result = await callAI(
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
    }).filter((x): x is { id: string; title: string; relevance: string } => x !== null);
  } catch {
    return [];
  }
}

/**
 * Verifica se l'AI è configurata (Groq o Anthropic)
 */
export async function isAIConfigured(): Promise<boolean> {
  const groq = await getGroqKey();
  if (groq) return true;
  const anthropic = await getAnthropicKey();
  return !!anthropic;
}
