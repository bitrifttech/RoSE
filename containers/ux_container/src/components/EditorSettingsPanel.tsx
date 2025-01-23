import React, { useState } from 'react';
import { useEditorSettings } from '@/contexts/EditorSettings';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from './ui/use-toast';

interface EditorSettingsPanelProps {
  onClose: () => void;
}

export const EditorSettingsPanel: React.FC<EditorSettingsPanelProps> = ({ onClose }) => {
  const { settings, availableLLMs, updateSettings, updateLLMSettings } = useEditorSettings();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLLMUpdate = async (field: keyof typeof settings.llmConfig, value: string | number) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      const newConfig = {
        ...settings.llmConfig,
        [field]: value,
      };
      await updateLLMSettings(newConfig);
      toast({
        title: "LLM Settings Updated",
        description: "Successfully updated LLM configuration",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update LLM settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-background border-l border-border/40 p-4 shadow-lg z-50 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Editor Settings</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-accent/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Editor Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Editor</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="minimap">Show Minimap</Label>
            <Switch
              id="minimap"
              checked={settings.minimap}
              onCheckedChange={(checked) => updateSettings({ minimap: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="wordWrap">Word Wrap</Label>
            <Switch
              id="wordWrap"
              checked={settings.wordWrap}
              onCheckedChange={(checked) => updateSettings({ wordWrap: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="formatOnSave">Format on Save</Label>
            <Switch
              id="formatOnSave"
              checked={settings.formatOnSave}
              onCheckedChange={(checked) => updateSettings({ formatOnSave: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="lineNumbers">Line Numbers</Label>
            <Switch
              id="lineNumbers"
              checked={settings.lineNumbers}
              onCheckedChange={(checked) => updateSettings({ lineNumbers: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontSize">Font Size</Label>
            <Slider
              id="fontSize"
              min={8}
              max={24}
              step={1}
              value={[settings.fontSize]}
              onValueChange={([value]) => updateSettings({ fontSize: value })}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-right">
              {settings.fontSize}px
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tabSize">Tab Size</Label>
            <Slider
              id="tabSize"
              min={2}
              max={8}
              step={2}
              value={[settings.tabSize]}
              onValueChange={([value]) => updateSettings({ tabSize: value })}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-right">
              {settings.tabSize} spaces
            </div>
          </div>
        </div>

        {/* LLM Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Language Model</h3>
          
          <div className="space-y-2">
            <Label htmlFor="llm-type">Provider</Label>
            <Select
              value={settings.llmConfig.llm_type}
              onValueChange={(value) => handleLLMUpdate('llm_type', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(availableLLMs).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-name">Model</Label>
            <Select
              value={settings.llmConfig.model_name}
              onValueChange={(value) => handleLLMUpdate('model_name', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLLMs[settings.llmConfig.llm_type]?.models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[settings.llmConfig.temperature]}
              onValueChange={([value]) => handleLLMUpdate('temperature', value)}
              disabled={isUpdating}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-right">
              {settings.llmConfig.temperature.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
