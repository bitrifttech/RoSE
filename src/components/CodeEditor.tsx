import React, { useCallback, useRef, useEffect } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { editor } from 'monaco-editor';
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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
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

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

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

    // Configure editor
    editor.updateOptions({
      minimap: { 
        enabled: settings.minimap,
        maxColumn: 80,
        renderCharacters: false,
      },
      fontSize: settings.fontSize,
      lineNumbers: "on",
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: settings.wordWrap ? "on" : "off",
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

  }, [onSave, settings]);

  useEffect(() => {
    // Update editor options when settings change
    if (editorRef.current) {
      editorRef.current.updateOptions({
        minimap: { enabled: settings.minimap },
        wordWrap: settings.wordWrap ? "on" : "off",
        fontSize: settings.fontSize,
      });
    }
  }, [settings]);

  return (
    <Editor
      height="100%"
      defaultLanguage={language}
      path={path}
      value={value}
      onChange={onChange}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      options={{
        ...shortcuts
      }}
    />
  );
};

export default CodeEditor;