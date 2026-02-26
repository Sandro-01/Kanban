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
const CLAUDE_MODEL   = 'claude-sonnet-4-6';

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

  const systemPrompt = `You are an IT support assistant for a packaging company.
Analyze the request and suggest the most appropriate category and priority.

Available categories: ${categories.join(', ')}
Available priorities: LOW, MEDIUM, HIGH, CRITICAL

Reply ONLY in JSON format (no other text):
{"category": "...", "priority": "...", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

  const result = await callAI(systemPrompt, `Title: ${title}\nDescription: ${description}`, 256);
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
    .map(c => `[${c.isEmail ? 'EMAIL' : 'COMMENT'} from ${c.author}]: ${c.content}`)
    .join('\n');

  const kbContext = kbArticles && kbArticles.length > 0
    ? `\n\nRelevant Knowledge Base articles:\n${kbArticles.map(a => `- ${a.title}: ${a.content.substring(0, 300)}`).join('\n')}`
    : '';

  const systemPrompt = `You are an IT support operator for a packaging company.
Write a professional and concise response in English for this ticket.
If there are relevant KB articles, use them as reference.
Do NOT invent specific technical solutions if you don't have enough information.
Write only the response text, without quotes or prefixes.`;

  const userMsg = `Ticket: ${ticketTitle}
Description: ${ticketDescription}
${commentsText ? `\nConversation:\n${commentsText}` : ''}${kbContext}

Write an appropriate response:`;

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

  const systemPrompt = `You are an assistant that detects duplicate or very similar tickets.
Compare the NEW ticket with the list of existing tickets.
If you find similar tickets (same issue, same request), list them.

Reply ONLY in JSON array format (no other text):
[{"id": "partial-id", "similarity": "brief explanation"}]
If there are no duplicates, reply: []`;

  const result = await callAI(
    systemPrompt,
    `NEW TICKET:\nTitle: ${title}\nDescription: ${description}\n\nEXISTING TICKETS:\n${ticketList}`,
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

  const systemPrompt = `You are an assistant that suggests relevant Knowledge Base articles.
Compare the described problem with the available articles.
Suggest the most useful ones for solving the problem.

Reply ONLY in JSON array format:
[{"id": "partial-id", "relevance": "brief explanation"}]
If no article is relevant, reply: []`;

  const result = await callAI(
    systemPrompt,
    `PROBLEM:\nTitle: ${title}\nDescription: ${description}\n\nKB ARTICLES:\n${articleList}`,
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
