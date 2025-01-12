import React, { useCallback, useRef, useEffect } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { editor } from 'monaco-editor';
import { getShortcutConfig } from "@/utils/editor";

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
  const shortcuts = getShortcutConfig();

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // Configure editor
    editor.updateOptions({
      minimap: { 
        enabled: true,
        maxColumn: 80,
        renderCharacters: false,
      },
      fontSize: 14,
      lineNumbers: "on",
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: "on",
      folding: true,
      foldingHighlight: true,
      foldingStrategy: "auto",
      showFoldingControls: "always",
      matchBrackets: "always",
      autoClosingBrackets: "always",
      autoClosingQuotes: "always",
      formatOnPaste: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "on",
      tabSize: 2,
      padding: { top: 16 },
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: true,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      },
      renderLineHighlight: "all",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      quickSuggestions: true,
      bracketPairColorization: {
        enabled: true,
      },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      contextmenu: true,
      mouseWheelZoom: true,
      renderWhitespace: "selection",
    });
  }, [onSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={onChange}
        theme="vs"
        path={path}
        onMount={handleEditorDidMount}
        options={{
          readOnly: false,
        }}
      />
    </div>
  );
};

export default CodeEditor;