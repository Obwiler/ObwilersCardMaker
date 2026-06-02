declare module 'monaco-editor' {
  export namespace editor {
    function create(
      container: HTMLElement,
      options: Record<string, unknown>,
    ): {
      onDidChangeModelContent(cb: () => void): void;
      getValue(): string;
      dispose(): void;
    };
    function defineTheme(
      name: string,
      options: Record<string, unknown>,
    ): void;
  }
  export namespace languages {
    function getLanguages(): Array<{ id: string }>;
    function register(options: { id: string }): void;
    function setMonarchTokensProvider(
      languageId: string,
      provider: Record<string, unknown>,
    ): void;
    function setLanguageConfiguration(
      languageId: string,
      config: Record<string, unknown>,
    ): void;
    function registerCompletionItemProvider(
      languageId: string,
      provider: {
        provideCompletionItems: (
          model: unknown,
          position: unknown,
        ) => { suggestions: unknown[] };
        triggerCharacters?: string[];
      },
    ): void;
  }
}
