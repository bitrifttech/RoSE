import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAvailableLLMs, updateLLMConfig } from '@/api/llm';

interface LLMConfig {
  llm_type: string;
  model_name: string;
  temperature: number;
  additional_params?: Record<string, any>;
}

interface LLMInfo {
  name: string;
  models: string[];
}

interface EditorSettings {
  formatOnSave: boolean;
  minimap: boolean;
  wordWrap: boolean;
  fontSize: number;
  tabSize: number;
  lineNumbers: boolean;
  llmConfig: LLMConfig;
}

interface EditorSettingsContextType {
  settings: EditorSettings;
  availableLLMs: Record<string, LLMInfo>;
  updateSettings: (settings: Partial<EditorSettings>) => void;
  updateLLMSettings: (config: LLMConfig) => Promise<void>;
}

const defaultLLMConfig: LLMConfig = {
  llm_type: 'openai',
  model_name: 'gpt-4',
  temperature: 0.7,
};

const defaultSettings: EditorSettings = {
  formatOnSave: true,
  minimap: true,
  wordWrap: true,
  fontSize: 14,
  tabSize: 2,
  lineNumbers: true,
  llmConfig: defaultLLMConfig,
};

const EditorSettingsContext = createContext<EditorSettingsContextType>({
  settings: defaultSettings,
  availableLLMs: {},
  updateSettings: () => {},
  updateLLMSettings: async () => {},
});

export function useEditorSettings() {
  return useContext(EditorSettingsContext);
}

export function EditorSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<EditorSettings>(() => {
    const savedSettings = localStorage.getItem('editorSettings');
    return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
  });
  
  const [availableLLMs, setAvailableLLMs] = useState<Record<string, LLMInfo>>({});

  useEffect(() => {
    // Fetch available LLMs and current config on mount
    getAvailableLLMs().then(({ available_llms, current_config }) => {
      setAvailableLLMs(available_llms);
      setSettings(prev => ({
        ...prev,
        llmConfig: current_config,
      }));
    }).catch(console.error);
  }, []);

  const updateSettings = (newSettings: Partial<EditorSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('editorSettings', JSON.stringify(updated));
      return updated;
    });
  };
  
  const updateLLMSettings = async (config: LLMConfig) => {
    try {
      await updateLLMConfig(config);
      setSettings(prev => ({
        ...prev,
        llmConfig: config,
      }));
    } catch (error) {
      console.error('Failed to update LLM config:', error);
      throw error;
    }
  };

  return (
    <EditorSettingsContext.Provider value={{ settings, availableLLMs, updateSettings, updateLLMSettings }}>
      {children}
    </EditorSettingsContext.Provider>
  );
}
