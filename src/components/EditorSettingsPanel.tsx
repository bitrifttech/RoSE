import React from 'react';
import { useEditorSettings } from '@/contexts/EditorSettings';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { Button } from './ui/button';
import { Settings } from 'lucide-react';

export function EditorSettingsPanel() {
  const { settings, updateSettings } = useEditorSettings();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editor Settings</SheetTitle>
          <SheetDescription>
            Customize your coding experience
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="format-on-save">Format on Save</Label>
            <Switch
              id="format-on-save"
              checked={settings.formatOnSave}
              onCheckedChange={(checked) => updateSettings({ formatOnSave: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="minimap">Show Minimap</Label>
            <Switch
              id="minimap"
              checked={settings.minimap}
              onCheckedChange={(checked) => updateSettings({ minimap: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="word-wrap">Word Wrap</Label>
            <Switch
              id="word-wrap"
              checked={settings.wordWrap}
              onCheckedChange={(checked) => updateSettings({ wordWrap: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label>Font Size</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.fontSize]}
                onValueChange={([value]) => updateSettings({ fontSize: value })}
                min={10}
                max={24}
                step={1}
              />
              <span className="w-12 text-sm">{settings.fontSize}px</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Format Document: Cmd/Ctrl + Shift + F</p>
              <p>Jump to Definition: Cmd/Ctrl + F12</p>
              <p>Find References: Alt + F12</p>
              <p>Save: Cmd/Ctrl + S</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
