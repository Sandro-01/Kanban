import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.middleware';

const router = Router();

// GET /api/kb — lista articoli (con ricerca)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const search = (req.query.search as string) || '';
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string) || 30;

    let where = `WHERE "published" = true`;
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      where += ` AND (LOWER("title") LIKE $${paramIdx} OR LOWER("content") LIKE $${paramIdx} OR $${paramIdx + 1} = ANY(LOWER("tags"::text)::text[]))`;
      params.push(`%${search.toLowerCase()}%`, search.toLowerCase());
      paramIdx += 2;
    }
    if (category) {
      where += ` AND "category" = $${paramIdx}`;
      params.push(category);
      paramIdx += 1;
    }

    params.push(limit);

    const articles: any[] = await prisma.$queryRawUnsafe(
      `SELECT "id", "title", "category", "tags", "authorId", "viewCount", "helpfulCount", "createdAt", "updatedAt",
              LEFT("content", 200) as "preview"
       FROM "KBArticle" ${where}
       ORDER BY "helpfulCount" DESC, "viewCount" DESC, "createdAt" DESC
       LIMIT $${paramIdx}`,
      ...params
    );

    // Ottieni categorie disponibili
    const categories: any[] = await prisma.$queryRawUnsafe(
      `SELECT DISTINCT "category" FROM "KBArticle" WHERE "published" = true ORDER BY "category"`
    );

    res.json({
      articles,
      categories: categories.map(c => c.category),
    });
  } catch (error: any) {
    console.error('Error fetching KB articles:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/kb/:id — singolo articolo
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const articles: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "KBArticle" WHERE "id" = $1`, req.params.id
    );
    if (articles.length === 0) {
      return res.status(404).json({ error: 'Articolo non trovato' });
    }

    // Incrementa visualizzazioni
    await prisma.$executeRawUnsafe(
      `UPDATE "KBArticle" SET "viewCount" = "viewCount" + 1 WHERE "id" = $1`, req.params.id
    );

    // Aggiungi info autore
    const author: any[] = await prisma.$queryRawUnsafe(
      `SELECT "firstName", "lastName" FROM "User" WHERE "id" = $1`, articles[0].authorId
    );

    res.json({
      ...articles[0],
      authorName: author.length > 0 ? `${author[0].firstName} ${author[0].lastName}` : 'Sconosciuto',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/kb — crea articolo (ADMIN)
router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { title, content, category, tags } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'title, content e category sono obbligatori' });
    }

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
    const tagsArray = Array.isArray(tags) ? tags : [];

    await prisma.$executeRawUnsafe(
      `INSERT INTO "KBArticle" ("id", "title", "content", "category", "tags", "authorId", "published", "viewCount", "helpfulCount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, true, 0, 0, NOW(), NOW())`,
      id, title, content, category, tagsArray, req.user!.id
    );

    res.status(201).json({ id, title, category });
  } catch (error: any) {
    console.error('Error creating KB article:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/kb/:id — aggiorna articolo (ADMIN)
router.put('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { title, content, category, tags, published } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`"title" = $${idx}`); params.push(title); idx++; }
    if (content !== undefined) { updates.push(`"content" = $${idx}`); params.push(content); idx++; }
    if (category !== undefined) { updates.push(`"category" = $${idx}`); params.push(category); idx++; }
    if (tags !== undefined) { updates.push(`"tags" = $${idx}`); params.push(tags); idx++; }
    if (published !== undefined) { updates.push(`"published" = $${idx}`); params.push(published); idx++; }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }

    updates.push(`"updatedAt" = NOW()`);
    params.push(req.params.id);

    await prisma.$executeRawUnsafe(
      `UPDATE "KBArticle" SET ${updates.join(', ')} WHERE "id" = $${idx}`,
      ...params
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/kb/:id — elimina articolo (ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "KBArticle" WHERE "id" = $1`, req.params.id
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/kb/:id/helpful — segna come utile
router.post('/:id/helpful', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "KBArticle" SET "helpfulCount" = "helpfulCount" + 1 WHERE "id" = $1`, req.params.id
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
