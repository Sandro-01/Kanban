import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import './RichTextEditor.css';

export interface RichTextEditorHandle {
  replaceMentionQuery: (query: string, html: string) => void;
  insertText: (text: string) => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  borderless?: boolean;
  onPasteFiles?: (files: File[]) => void;
  onMentionQuery?: (query: string | null) => void;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  (
    {
      value,
      onChange,
      placeholder,
      minHeight = 60,
      borderless,
      onPasteFiles,
      onMentionQuery,
    },
    ref
  ) => {
    const divRef = useRef<HTMLDivElement>(null);
    /** Tracks the last HTML we set ourselves, so we can skip no-op external updates */
    const lastHtmlRef = useRef('');

    /* ── Sync external reset (e.g. setComment('') after submit) ── */
    useEffect(() => {
      const el = divRef.current;
      if (!el) return;
      if (value === '' && lastHtmlRef.current !== '') {
        el.innerHTML = '';
        lastHtmlRef.current = '';
      }
    }, [value]);

    /* ── Detect the current @mention query at cursor ── */
    const getCurrentMentionQuery = (): string | null => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return null;
      const text = node.textContent ?? '';
      const before = text.substring(0, range.startOffset);
      const atIdx = before.lastIndexOf('@');
      if (atIdx === -1) return null;
      const query = before.substring(atIdx + 1);
      if (/\s/.test(query)) return null; // space breaks the mention
      return query;
    };

    /* ── Input handler ── */
    const handleInput = useCallback(() => {
      const el = divRef.current;
      if (!el) return;
      const html = el.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
      onMentionQuery?.(getCurrentMentionQuery());
    }, [onChange, onMentionQuery]);

    /* ── Paste handler ── */
    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedFiles = Array.from(e.clipboardData.files);
        if (pastedFiles.length > 0 && onPasteFiles) {
          e.preventDefault();
          onPasteFiles(pastedFiles);
          return;
        }
        // Strip HTML from clipboard — insert plain text only
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      },
      [onPasteFiles]
    );

    /* ── Imperative handle ── */
    useImperativeHandle(ref, () => ({
      replaceMentionQuery(query: string, html: string) {
        const el = divRef.current;
        if (!el) return;
        el.focus();

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE) return;

        const text = node.textContent ?? '';
        const offset = range.startOffset;
        const before = text.substring(0, offset);
        const atIdx = before.lastIndexOf('@');
        if (atIdx === -1) return;

        // Select @query and delete it
        const replRange = document.createRange();
        replRange.setStart(node, atIdx);
        replRange.setEnd(node, offset);
        replRange.deleteContents();

        // Insert mention node + trailing space
        const tmp = document.createElement('div');
        tmp.innerHTML = html + '\u00a0'; // non-breaking space after mention
        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        replRange.insertNode(frag);

        // Move cursor to end of insertion
        sel.collapseToEnd();

        const newHtml = el.innerHTML;
        lastHtmlRef.current = newHtml;
        onChange(newHtml);
        onMentionQuery?.(null);
      },

      insertText(text: string) {
        const el = divRef.current;
        if (!el) return;
        el.focus();
        document.execCommand('insertText', false, text);
        const newHtml = el.innerHTML;
        lastHtmlRef.current = newHtml;
        onChange(newHtml);
      },
    }));

    return (
      <div className={`rte-wrapper${borderless ? ' rte-borderless' : ''}`}>
        <div
          ref={divRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className="rte-content"
          style={{ minHeight }}
          onInput={handleInput}
          onPaste={handlePaste}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
