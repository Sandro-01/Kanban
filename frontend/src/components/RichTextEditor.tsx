import React, { useRef, useCallback, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  /** Replace the @query being typed at the cursor with the given HTML mention chip */
  replaceMentionQuery: (query: string, mentionHtml: string) => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Called when images are pasted/dropped from clipboard */
  onPasteFiles?: (files: File[]) => void;
  /** Remove outer border/radius (used when the parent provides its own container styling) */
  borderless?: boolean;
  /** Called with the current @mention query (text after @) or null when no mention is active */
  onMentionQuery?: (query: string | null) => void;
}

const HIGHLIGHT_COLORS = [
  { value: '#FFFF99', label: 'Yellow' },
  { value: '#B9F6CA', label: 'Green' },
  { value: '#BBDEFB', label: 'Blue' },
  { value: '#F8BBD0', label: 'Pink' },
  { value: '#FFE0B2', label: 'Orange' },
  { value: 'transparent', label: 'Remove' },
];

const FONT_SIZES = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '5' },
  { label: 'Heading', value: 'h3' },
];

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Scrivi qui...',
  minHeight = 120,
  onPasteFiles,
  borderless = false,
  onMentionQuery,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);

  // Sync external value changes into contentEditable
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);

      // Detect @mention query at cursor position
      if (onMentionQuery) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const node = range.startContainer;
          if (node.nodeType === Node.TEXT_NODE) {
            const before = (node.textContent || '').slice(0, range.startOffset);
            // Match @followed-by-non-space chars at end of text (includes emails like @a@b.com)
            const match = before.match(/@([\w.@+-]*)$/);
            onMentionQuery(match ? match[1] : null);
          } else {
            onMentionQuery(null);
          }
        } else {
          onMentionQuery(null);
        }
      }
    }
  }, [onChange, onMentionQuery]);

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      editorRef.current?.focus();
      document.execCommand('insertText', false, text);
      if (editorRef.current) {
        isInternalChange.current = true;
        onChange(editorRef.current.innerHTML);
      }
    },
    replaceMentionQuery: (query: string, mentionHtml: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const offset = range.startOffset;
        const before = text.slice(0, offset);
        // Find the @ that started this mention (accounts for emails like a@b.com)
        const atIdx = before.lastIndexOf('@');
        if (atIdx !== -1) {
          const newRange = document.createRange();
          newRange.setStart(node, atIdx);
          newRange.setEnd(node, offset);
          sel.removeAllRanges();
          sel.addRange(newRange);
          document.execCommand('insertHTML', false, mentionHtml);
          isInternalChange.current = true;
          onChange(editor.innerHTML);
        }
      }
    },
  }));

  const execCmd = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0 && onPasteFiles) {
      onPasteFiles(imageFiles);
      return;
    }

    if (!e.clipboardData.types.includes('Files')) {
      const text = e.clipboardData.getData('text/plain');
      if (text) {
        e.preventDefault();
        document.execCommand('insertText', false, text);
      }
    }
  }, [onPasteFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); execCmd('bold'); }
      if (e.key === 'i') { e.preventDefault(); execCmd('italic'); }
      if (e.key === 'u') { e.preventDefault(); execCmd('underline'); }
    }
  }, [execCmd]);

  const insertTable = useCallback(() => {
    const cell = (header = false) => {
      const tag = header ? 'th' : 'td';
      return `<${tag} style="border:1px solid #ccc;padding:6px 10px;min-width:60px">&nbsp;</${tag}>`;
    };
    const row = (header = false) => `<tr>${cell(header).repeat(3)}</tr>`;
    const table = `<table style="border-collapse:collapse;width:100%;margin:8px 0">${row(true)}${row()}${row()}</table><p><br></p>`;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, table);
    handleInput();
  }, [handleInput]);

  const applyHighlight = useCallback((color: string) => {
    setShowHighlight(false);
    editorRef.current?.focus();
    if (color === 'transparent') {
      document.execCommand('removeFormat');
    } else {
      document.execCommand('backColor', false, color);
    }
    handleInput();
  }, [handleInput]);

  const applyFontSize = useCallback((value: string) => {
    setShowFontSize(false);
    editorRef.current?.focus();
    if (value === 'h3') {
      document.execCommand('formatBlock', false, 'h3');
    } else {
      document.execCommand('fontSize', false, value);
    }
    handleInput();
  }, [handleInput]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = () => {
      setShowHighlight(false);
      setShowFontSize(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const btn: React.CSSProperties = {
    padding: '3px 7px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    lineHeight: 1,
    minWidth: '26px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
  };

  const sep: React.CSSProperties = {
    width: '1px',
    height: '18px',
    background: '#d1d5db',
    margin: '0 3px',
    display: 'inline-block',
    flexShrink: 0,
  };

  const popupBase: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    zIndex: 200,
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  return (
    <div style={borderless
      ? { overflow: 'hidden', background: '#fff' }
      : { border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden', background: '#fff' }
    }>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '3px',
        padding: '5px 8px',
        borderBottom: '1px solid #e5e7eb',
        background: '#f9fafb',
      }}>
        {/* Text formatting */}
        <button type="button" style={btn} onClick={() => execCmd('bold')} title="Bold (Ctrl+B)">
          <b style={{ fontSize: '13px' }}>B</b>
        </button>
        <button type="button" style={{ ...btn, fontStyle: 'italic' }} onClick={() => execCmd('italic')} title="Italic (Ctrl+I)">
          <i>I</i>
        </button>
        <button type="button" style={{ ...btn, textDecoration: 'underline' }} onClick={() => execCmd('underline')} title="Underline (Ctrl+U)">
          U
        </button>
        <button type="button" style={{ ...btn, textDecoration: 'line-through' }} onClick={() => execCmd('strikeThrough')} title="Strikethrough">
          S
        </button>

        <span style={sep} />

        {/* Lists */}
        <button type="button" style={btn} onClick={() => execCmd('insertUnorderedList')} title="Bullet list">
          ☰
        </button>
        <button type="button" style={btn} onClick={() => execCmd('insertOrderedList')} title="Numbered list">
          <span style={{ fontSize: '10px', fontWeight: 700 }}>1.</span>☰
        </button>

        <span style={sep} />

        {/* Table */}
        <button type="button" style={btn} onClick={insertTable} title="Insert table">
          ⊞
        </button>

        {/* Highlight color */}
        <div style={{ position: 'relative', display: 'inline-flex' }} onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            style={{ ...btn, flexDirection: 'column', gap: 0, paddingBottom: '2px' }}
            onClick={() => { setShowHighlight(p => !p); setShowFontSize(false); }}
            title="Highlight color"
          >
            <span style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1 }}>A</span>
            <span style={{ width: '100%', height: '3px', background: '#FFFF00', borderRadius: '1px', display: 'block', marginTop: '1px' }} />
          </button>
          {showHighlight && (
            <div style={{ ...popupBase, padding: '6px', display: 'flex', gap: '4px' }}>
              {HIGHLIGHT_COLORS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyHighlight(value)}
                  title={label}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: '1px solid #999',
                    background: value === 'transparent'
                      ? 'linear-gradient(135deg, #fff 40%, #f00 40%, #f00 60%, #fff 60%)'
                      : value,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Font size */}
        <div style={{ position: 'relative', display: 'inline-flex' }} onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            style={btn}
            onClick={() => { setShowFontSize(p => !p); setShowHighlight(false); }}
            title="Font size"
          >
            <span style={{ fontSize: '10px' }}>A</span>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>A</span>
          </button>
          {showFontSize && (
            <div style={{ ...popupBase, minWidth: '100px', overflow: 'hidden' }}>
              {FONT_SIZES.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyFontSize(value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 12px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={sep} />

        {/* Blockquote */}
        <button type="button" style={{ ...btn, fontSize: '16px', fontWeight: 700 }} onClick={() => execCmd('formatBlock', 'blockquote')} title="Blockquote">
          ❝
        </button>

        {/* Link */}
        <button type="button" style={btn} onClick={() => {
          const url = prompt('Insert URL:');
          if (url) execCmd('createLink', url);
        }} title="Insert link">🔗</button>

        {/* Code */}
        <button type="button" style={{ ...btn, fontFamily: 'monospace', fontSize: '12px' }} onClick={() => execCmd('formatBlock', 'pre')} title="Code block">
          &lt;/&gt;
        </button>

        <span style={sep} />

        {/* Remove format */}
        <button type="button" style={btn} onClick={() => execCmd('removeFormat')} title="Remove formatting">
          T<span style={{ textDecoration: 'line-through', fontSize: '10px' }}>x</span>
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '12px',
          outline: 'none',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#1f2937',
          wordBreak: 'break-word',
        }}
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
        [contenteditable] pre {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 8px 12px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          white-space: pre-wrap;
          overflow-x: auto;
        }
        [contenteditable] blockquote {
          border-left: 4px solid #d1d5db;
          margin: 8px 0;
          padding: 4px 16px;
          color: #6b7280;
          background: #f9fafb;
          font-style: italic;
        }
        [contenteditable] h3 {
          font-size: 18px;
          font-weight: 700;
          margin: 8px 0 4px;
        }
        [contenteditable] a { color: #2563eb; text-decoration: underline; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 24px; }
        [contenteditable] table { border-collapse: collapse; width: 100%; }
        [contenteditable] td, [contenteditable] th {
          border: 1px solid #ccc;
          padding: 6px 10px;
          min-width: 40px;
        }
        [contenteditable] th { background: #f3f4f6; font-weight: 700; }
        .mention {
          display: inline-block;
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.4;
          cursor: default;
          user-select: none;
        }
        .mention--user  { background: #ede9fe; color: #6d28d9; }
        .mention--email { background: #dcfce7; color: #15803d; }
      `}</style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
