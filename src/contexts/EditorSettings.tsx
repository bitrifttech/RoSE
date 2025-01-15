import React, { createContext, useContext, useState } from 'react';

interface EditorSettings {
  formatOnSave: boolean;
  minimap: boolean;
  wordWrap: boolean;
  fontSize: number;
  tabSize: number;
  lineNumbers: boolean;
}

interface EditorSettingsContextType {
  settings: EditorSettings;
  updateSettings: (settings: Partial<EditorSettings>) => void;
}

const defaultSettings: EditorSettings = {
  formatOnSave: true,
  minimap: true,
  wordWrap: true,
  fontSize: 14,
  tabSize: 2,
  lineNumbers: true,
};

const EditorSettingsContext = createContext<EditorSettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export function useEditorSettings() {
  return useContext(EditorSettingsContext);
}

export function EditorSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<EditorSettings>(() => {
    const savedSettings = localStorage.getItem('editorSettings');
    return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
  });

  const updateSettings = (newSettings: Partial<EditorSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('editorSettings', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <EditorSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </EditorSettingsContext.Provider>
  );
}
