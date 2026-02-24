import { Router } from 'express';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';
import {
  suggestCategoryAndPriority,
  suggestResponse,
  findDuplicates,
  suggestKBArticles,
  isAIConfigured,
} from '../services/ai.service';
import { prisma } from '../index';

const router = Router();

// GET /api/ai/status — verifica se l'AI è configurata
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  const configured = await isAIConfigured();
  res.json({ configured });
});

// POST /api/ai/suggest-category — suggerisci categoria e priorità
router.post('/suggest-category', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title obbligatorio' });

    const suggestion = await suggestCategoryAndPriority(title, description || '');
    if (!suggestion) {
      return res.json({ suggestion: null, message: 'AI non configurata o non disponibile' });
    }

    res.json({ suggestion });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/suggest-response — suggerisci risposta per ticket
router.post('/suggest-response', authenticate, async (req: AuthRequest, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ error: 'ticketId obbligatorio' });

    // Recupera ticket e commenti
    const tickets: any[] = await prisma.$queryRawUnsafe(
      `SELECT "title", "description" FROM "Ticket" WHERE "id" = $1`, ticketId
    );
    if (tickets.length === 0) return res.status(404).json({ error: 'Ticket non trovato' });

    const comments: any[] = await prisma.$queryRawUnsafe(
      `SELECT c."content", c."isEmailReply", c."fromEmail",
              u."firstName" || ' ' || u."lastName" as "authorName"
       FROM "Comment" c
       JOIN "User" u ON c."userId" = u."id"
       WHERE c."ticketId" = $1 AND c."isDeleted" = false
       ORDER BY c."createdAt" DESC LIMIT 10`,
      ticketId
    );

    const recentComments = comments.reverse().map((c: any) => ({
      author: c.fromEmail || c.authorName,
      content: c.content.substring(0, 300),
      isEmail: c.isEmailReply,
    }));

    // Cerca articoli KB pertinenti
    let kbArticles: any[] = [];
    try {
      const kbResults: any[] = await prisma.$queryRawUnsafe(
        `SELECT "title", "content" FROM "KBArticle" WHERE "published" = true LIMIT 20`
      );
      kbArticles = kbResults;
    } catch { /* KB non ancora disponibile */ }

    const rawResponse = await suggestResponse(
      tickets[0].title,
      tickets[0].description,
      recentComments,
      kbArticles.length > 0 ? kbArticles : undefined
    );

    // Converte plain text con \n\n in HTML <p> per il RichTextEditor
    const response = rawResponse
      ? rawResponse
          .split(/\n\n+/)
          .map(para => {
            const inner = para.trim().replace(/\n/g, '<br>');
            return `<p>${inner}</p>`;
          })
          .join('')
      : null;

    res.json({ response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/find-duplicates — cerca ticket simili/duplicati
router.post('/find-duplicates', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title obbligatorio' });

    const duplicates = await findDuplicates(title, description || '');
    res.json({ duplicates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/suggest-kb — suggerisci articoli KB
router.post('/suggest-kb', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title obbligatorio' });

    const articles = await suggestKBArticles(title, description || '');
    res.json({ articles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/config — salva API key (ADMIN)
router.post('/config', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'apiKey obbligatorio' });

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SystemConfig" ("key", "value", "updatedAt")
       VALUES ('ANTHROPIC_API_KEY', $1, NOW())
       ON CONFLICT ("key") DO UPDATE SET "value" = $1, "updatedAt" = NOW()`,
      apiKey
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
