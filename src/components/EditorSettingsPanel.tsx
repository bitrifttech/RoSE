import React from 'react';
import { useEditorSettings } from '@/contexts/EditorSettings';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface EditorSettingsPanelProps {
  onClose: () => void;
}

export const EditorSettingsPanel: React.FC<EditorSettingsPanelProps> = ({ onClose }) => {
  const { settings, updateSettings } = useEditorSettings();

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-background border-l border-border/40 p-4 shadow-lg z-50">
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
        <div className="space-y-4">
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
        </div>

        <div className="space-y-2">
          <Label>Font Size</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => updateSettings({ fontSize: value })}
              min={8}
              max={32}
              step={1}
              className="flex-1"
            />
            <span className="w-8 text-sm">{settings.fontSize}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
