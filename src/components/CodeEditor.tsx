import React from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

const CodeEditor = ({ value, onChange, language = "typescript" }: CodeEditorProps) => {
  console.log("CodeEditor rendered with language:", language);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={onChange}
        theme="light"
        options={{
          minimap: { enabled: true },
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
          guides: {
            bracketPairs: true,
            indentation: true,
          }
        }}
      />
    </div>
  );
};

export default CodeEditor;