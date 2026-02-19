import React, { useRef, useCallback, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Called when images are pasted/dropped from clipboard */
  onPasteFiles?: (files: File[]) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Scrivi qui...',
  minHeight = 120,
  onPasteFiles,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

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
    }
  }, [onChange]);

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

    // For non-image pastes: paste as plain text to avoid messy HTML from Word/Outlook
    if (!e.clipboardData.types.includes('Files')) {
      const text = e.clipboardData.getData('text/plain');
      if (text) {
        e.preventDefault();
        document.execCommand('insertText', false, text);
      }
    }
  }, [onPasteFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+B / Ctrl+I / Ctrl+U shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); execCmd('bold'); }
      if (e.key === 'i') { e.preventDefault(); execCmd('italic'); }
      if (e.key === 'u') { e.preventDefault(); execCmd('underline'); }
    }
  }, [execCmd]);

  const toolbarBtnStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    lineHeight: 1,
    minWidth: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '20px',
    background: '#d1d5db',
    margin: '0 4px',
    display: 'inline-block',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '3px',
        padding: '6px 8px',
        borderBottom: '1px solid #e5e7eb',
        background: '#f9fafb',
      }}>
        <button type="button" style={toolbarBtnStyle} onClick={() => execCmd('bold')} title="Grassetto (Ctrl+B)"><b>B</b></button>
        <button type="button" style={toolbarBtnStyle} onClick={() => execCmd('italic')} title="Corsivo (Ctrl+I)"><i>I</i></button>
        <button type="button" style={toolbarBtnStyle} onClick={() => execCmd('underline')} title="Sottolineato (Ctrl+U)"><u>U</u></button>
        <button type="button" style={toolbarBtnStyle} onClick={() => execCmd('strikeThrough')} title="Barrato"><s>S</s></button>

        <span style={separatorStyle} />

        <button type="button" style={toolbarBtnStyle} onClick={() => execCmd('insertUnorderedList')} title="Elenco puntato">&#8226; Lista</button>
        <button type="button" style={toolbarBtnStyle} onClick={() => execCmd('insertOrderedList')} title="Elenco numerato">1. Lista</button>

        <span style={separatorStyle} />

        <button type="button" style={toolbarBtnStyle} onClick={() => {
          const url = prompt('Inserisci URL:');
          if (url) execCmd('createLink', url);
        }} title="Inserisci link">🔗</button>
        <button type="button" style={toolbarBtnStyle} onClick={() => execCmd('formatBlock', 'pre')} title="Blocco codice">&lt;/&gt;</button>

        <span style={separatorStyle} />

        <button type="button" style={toolbarBtnStyle} onClick={() => execCmd('removeFormat')} title="Rimuovi formattazione">T&#x0336;</button>
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

      {/* CSS for placeholder */}
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
        [contenteditable] a { color: #2563eb; text-decoration: underline; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 24px; }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
