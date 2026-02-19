import React, { useEffect, useState } from 'react';
import { kb as kbApi } from '../services/api';
import RichTextEditor from './RichTextEditor';
import './KanbanBoard.css';

interface KnowledgeBaseProps {
  user: any;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ user }) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorData, setEditorData] = useState({ title: '', content: '', category: '', tags: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadArticles = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      const res = await kbApi.getAll(params);
      setArticles(res.data.articles || []);
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Error loading KB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadArticles(); }, [search, filterCategory]);

  const handleViewArticle = async (id: string) => {
    try {
      const res = await kbApi.getById(id);
      setSelectedArticle(res.data);
    } catch (err) {
      alert('Errore caricamento articolo');
    }
  };

  const handleSave = async () => {
    if (!editorData.title || !editorData.content || !editorData.category) {
      alert('Compila titolo, contenuto e categoria');
      return;
    }
    try {
      const data = {
        title: editorData.title,
        content: editorData.content,
        category: editorData.category,
        tags: editorData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (editingId) {
        await kbApi.update(editingId, data);
      } else {
        await kbApi.create(data);
      }
      setShowEditor(false);
      setEditingId(null);
      setEditorData({ title: '', content: '', category: '', tags: '' });
      loadArticles();
    } catch (err) {
      alert('Errore salvataggio');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Eliminare questo articolo?')) return;
    try {
      await kbApi.delete(id);
      setSelectedArticle(null);
      loadArticles();
    } catch (err) {
      alert('Errore eliminazione');
    }
  };

  const handleHelpful = async (id: string) => {
    try {
      await kbApi.markHelpful(id);
      if (selectedArticle?.id === id) {
        setSelectedArticle((prev: any) => ({ ...prev, helpfulCount: (prev.helpfulCount || 0) + 1 }));
      }
    } catch {}
  };

  const handleEdit = (article: any) => {
    setEditorData({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: (article.tags || []).join(', '),
    });
    setEditingId(article.id);
    setSelectedArticle(null);
    setShowEditor(true);
  };

  const defaultCategories = [
    'Hardware', 'Software', 'Rete', 'Email', 'Stampa',
    'ERP/Gestionale', 'Sicurezza', 'Procedure', 'FAQ', 'Altro',
  ];

  if (loading) return <div className="loading">Caricamento...</div>;

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="page" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button
          onClick={() => setSelectedArticle(null)}
          className="btn btn-secondary"
          style={{ marginBottom: '16px' }}
        >
          ← Torna alla lista
        </button>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '28px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                background: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: '600',
                marginBottom: '8px',
              }}>
                {selectedArticle.category}
              </span>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>{selectedArticle.title}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Di {selectedArticle.authorName} | {new Date(selectedArticle.createdAt).toLocaleDateString('it-IT')}
                {' | '}{selectedArticle.viewCount} visualizzazioni
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleHelpful(selectedArticle.id)}
                style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px',
                  padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#166534',
                }}
              >
                👍 Utile ({selectedArticle.helpfulCount || 0})
              </button>
              {user.role === 'ADMIN' && (
                <>
                  <button onClick={() => handleEdit(selectedArticle)} className="btn btn-secondary" style={{ fontSize: '13px' }}>
                    ✏️ Modifica
                  </button>
                  <button onClick={() => handleDelete(selectedArticle.id)} style={{
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
                    padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#dc2626',
                  }}>
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>

          {selectedArticle.tags?.length > 0 && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selectedArticle.tags.map((tag: string) => (
                <span key={tag} style={{
                  padding: '2px 8px', background: '#f1f5f9', borderRadius: '10px',
                  fontSize: '11px', color: '#64748b',
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />

          <div
            style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155' }}
            dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
          />
        </div>
      </div>
    );
  }

  // Editor view
  if (showEditor) {
    return (
      <div className="page" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2>{editingId ? 'Modifica Articolo' : 'Nuovo Articolo'}</h2>

        <div className="form-group">
          <label className="label">Titolo *</label>
          <input
            type="text"
            className="input"
            value={editorData.title}
            onChange={(e) => setEditorData({ ...editorData, title: e.target.value })}
            placeholder="Titolo dell'articolo"
          />
        </div>

        <div className="form-group">
          <label className="label">Categoria *</label>
          <select
            className="input"
            value={editorData.category}
            onChange={(e) => setEditorData({ ...editorData, category: e.target.value })}
          >
            <option value="">Seleziona categoria...</option>
            {[...new Set([...defaultCategories, ...categories])].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Tag (separati da virgola)</label>
          <input
            type="text"
            className="input"
            value={editorData.tags}
            onChange={(e) => setEditorData({ ...editorData, tags: e.target.value })}
            placeholder="es. wifi, password, outlook"
          />
        </div>

        <div className="form-group">
          <label className="label">Contenuto *</label>
          <RichTextEditor
            value={editorData.content}
            onChange={(html) => setEditorData({ ...editorData, content: html })}
            placeholder="Scrivi il contenuto dell'articolo..."
            minHeight={250}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setShowEditor(false); setEditingId(null); setEditorData({ title: '', content: '', category: '', tags: '' }); }}
          >
            Annulla
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {editingId ? 'Salva Modifiche' : 'Pubblica Articolo'}
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="page">
      <div className="page-header">
        <h1>📚 Knowledge Base</h1>
        {user.role === 'ADMIN' && (
          <button className="btn btn-primary" onClick={() => setShowEditor(true)}>
            + Nuovo Articolo
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input"
          placeholder="Cerca articoli..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select
          className="input"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="">Tutte le categorie</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Articles Grid */}
      {articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          {search || filterCategory ? 'Nessun articolo trovato' : 'Nessun articolo nella Knowledge Base. Crea il primo!'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {articles.map(article => (
            <div
              key={article.id}
              onClick={() => handleViewArticle(article.id)}
              style={{
                background: '#fff', borderRadius: '8px', padding: '20px',
                border: '1px solid #e2e8f0', cursor: 'pointer',
                transition: 'box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: '600',
                marginBottom: '10px',
              }}>
                {article.category}
              </span>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#0f172a' }}>{article.title}</h3>
              <p style={{
                margin: '0 0 12px', fontSize: '13px', color: '#64748b',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
              }}>
                {(article.preview || '').replace(/<[^>]*>/g, '')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                <span>👁 {article.viewCount} | 👍 {article.helpfulCount}</span>
                <span>{new Date(article.createdAt).toLocaleDateString('it-IT')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
