import { useEffect, useRef, useCallback } from 'react';

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  onParseResult?: (errors: ParseError[]) => void;
  readOnly?: boolean;
  minimap?: boolean;
  height?: string;
}

interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export function EditorPane({
  value,
  onChange,
  onParseResult,
  readOnly = false,
  minimap = false,
  height = '100%'
}: EditorPaneProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);

  const registerDZLanguage = useCallback((monaco: any) => {
    if (monaco.languages.getLanguages().some((l: any) => l.id === 'dz')) return;
    monaco.languages.register({ id: 'dz' });
    monaco.languages.setMonarchTokensProvider('dz', {
      tokenizer: {
        root: [
          [/^[^\s\[][^\[\n]*\s*\[[^\]]*\]$/, 'keyword.strong'],
          [/「[^」]*」/, 'mark'],
          [/\[[^\]]*\]/, 'comment'],
          [/^.*[：:]\s*$/, 'condition'],
          [/^\?\s*.*$/, 'branch'],
          [/^·\s*.*$/, 'option'],
          [/^—\s*.*$/, 'constant'],
          [/\b核心技能\b/, 'keyword'],
          [/\b消耗\b/, 'cost'],
          [/\b获得\b|\b恢复\b|\b增加\b|\b扣除\b/, 'predicate'],
          [/\b伤害\b|\b生命\b|\b护甲\b|\b技力\b/, 'attribute'],
          [/#.*$/, 'comment.line'],
        ],
      },
    });
    monaco.editor.defineTheme('dz-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'mark', foreground: '7ee787', fontStyle: 'bold' },
        { token: 'comment', foreground: '8b949e' },
        { token: 'condition', foreground: 'e3b341', fontStyle: 'bold' },
        { token: 'branch', foreground: 'f7786b', fontStyle: 'bold' },
        { token: 'option', foreground: 'bc8cff', fontStyle: 'bold' },
        { token: 'constant', foreground: '79c0ff', fontStyle: 'bold' },
        { token: 'keyword', foreground: '58a6ff', fontStyle: 'bold' },
        { token: 'keyword.strong', foreground: '58a6ff', fontStyle: 'bold' },
        { token: 'cost', foreground: 'f85149' },
        { token: 'predicate', foreground: '7ee787' },
        { token: 'attribute', foreground: 'd2a8ff' },
        { token: 'comment.line', foreground: '484f58' },
      ],
      colors: {
        'editor.background': '#161b22',
        'editor.lineHighlightBackground': '#1c2128',
        'editor.foreground': '#c9d1d9',
      },
    });
  }, []);

  useEffect(() => {
    let disposed = false;

    import('monaco-editor').then((monaco) => {
      if (disposed || !editorRef.current) return;
      monacoRef.current = monaco;
      registerDZLanguage(monaco);

      const editor = monaco.editor.create(editorRef.current!, {
        value,
        language: 'dz',
        theme: 'dz-theme',
        fontSize: 15,
        fontFamily: "'Noto Sans SC', 'Microsoft YaHei', monospace",
        lineNumbers: 'on',
        minimap: { enabled: minimap },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        readOnly,
        renderWhitespace: 'boundary',
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: 'always',
        suggest: { showWords: false, snippetsPreventQuickSuggestions: false },
      });

      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        onChange(newValue);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (onParseResult) {
            onParseResult(validateDZ(newValue));
          }
        }, 300);
      });

      (editorRef.current as any)._editor = editor;
    }).catch(() => {
      if (!disposed && editorRef.current && fallbackRef.current) {
        editorRef.current.style.display = 'none';
        fallbackRef.current.style.display = 'block';
      }
    });

    return () => {
      disposed = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      const el = editorRef.current;
      if (el && (el as any)._editor) {
        (el as any)._editor.dispose();
      }
    };
  }, []);

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <div ref={editorRef} style={{ width: '100%', height: '100%' }} />
      <textarea
        ref={fallbackRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        style={{
          display: 'none',
          width: '100%',
          height: '100%',
          background: '#0d1117',
          color: '#c9d1d9',
          border: 'none',
          resize: 'none',
          fontFamily: "'Noto Sans SC', 'Microsoft YaHei', monospace",
          fontSize: 14,
          padding: 12,
          lineHeight: 1.6,
          tabSize: 2,
        }}
      />
    </div>
  );
}

function validateDZ(text: string): ParseError[] {
  const errors: ParseError[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const oj = (line.match(/「/g) || []).length;
    const cj = (line.match(/」/g) || []).length;
    if (oj !== cj) errors.push({ line: i + 1, column: 0, message: '标记「」不匹配', severity: 'error' });
    const ob = (line.match(/\[/g) || []).length;
    const cb = (line.match(/\]/g) || []).length;
    if (ob !== cb) errors.push({ line: i + 1, column: 0, message: '备注[]不匹配', severity: 'warning' });
  }
  return errors;
}
