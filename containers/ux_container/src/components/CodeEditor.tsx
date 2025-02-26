import React, { useCallback, useRef, useEffect } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { getShortcutConfig } from "@/utils/editor";
import { useEditorSettings } from "@/contexts/EditorSettings";

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  path?: string;
  onSave?: () => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language = "typescript",
  path,
  onSave,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { settings } = useEditorSettings();
  const shortcuts = getShortcutConfig();

  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"]
    });

    // Add extra libraries
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `declare module "*.css";
       declare module "*.scss";
       declare module "*.svg" {
         const content: string;
         export default content;
       }`,
      "global.d.ts"
    );
  }, []);

  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Apply dark theme settings
    monaco.editor.defineTheme('customDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#121820',
        'editor.foreground': '#E2E8F0',
        'editorLineNumber.foreground': '#64748B',
        'editor.lineHighlightBackground': '#1E293B',
        'editorGutter.background': '#121820',
        'dropdown.background': '#121820',
        'input.background': '#1E293B',
      }
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (settings.formatOnSave) {
        editor.getAction('editor.action.formatDocument').run();
      }
      onSave?.();
    });

    // Jump to definition
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F12, () => {
      const position = editor.getPosition();
      if (position) {
        monaco.editor.getEditorLineNumberFromPosition(editor.getModel()!, position);
        editor.trigger('keyboard', 'editor.action.revealDefinition', null);
      }
    });

    // Find references
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F12, () => {
      const position = editor.getPosition();
      if (position) {
        editor.trigger('keyboard', 'editor.action.referenceSearch.trigger', null);
      }
    });

    // Set up editor options
    editor.updateOptions({
      fontFamily: settings.fontFamily || 'monospace',
      fontSize: settings.fontSize || 14,
      lineHeight: settings.lineHeight || 1.5,
      minimap: { enabled: settings.minimap },
      wordWrap: settings.wordWrap ? 'on' : 'off',
      lineNumbers: settings.lineNumbers ? 'on' : 'off',
      theme: document.documentElement.classList.contains('dark') ? 'customDark' : 'vs',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      folding: true,
      foldingHighlight: true,
      foldingStrategy: "auto",
      showFoldingControls: "always",
      matchBrackets: "always",
      autoClosingBrackets: "always",
      autoClosingQuotes: "always",
      autoIndent: "advanced",
      formatOnPaste: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true
      },
      quickSuggestionsDelay: 10,
      parameterHints: {
        enabled: true,
        cycle: true
      },
      suggest: {
        localityBonus: true,
        snippetsPreventQuickSuggestions: false,
        showIcons: true,
        maxVisibleSuggestions: 12,
        filterGraceful: true,
        showMethods: true,
        showFunctions: true,
        showConstructors: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showKeywords: true,
        showWords: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showSnippets: true,
      },
    });

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          editor.updateOptions({
            theme: isDark ? 'customDark' : 'vs'
          });
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Cleanup observer on unmount
    return () => observer.disconnect();
  }, [onSave, settings]);

  useEffect(() => {
    // Update editor options when settings change
    if (editorRef.current) {
      editorRef.current.updateOptions({
        minimap: { enabled: settings.minimap },
        wordWrap: settings.wordWrap ? "on" : "off",
        fontSize: settings.fontSize,
        lineNumbers: settings.lineNumbers ? "on" : "off",
      });
    }
  }, [settings]);

  return (
    <div className="w-full h-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={onChange}
        path={path}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={{
          ...shortcuts,
          automaticLayout: true,
          padding: { top: 16 },
        }}
      />
    </div>
  );
};

export default CodeEditor;