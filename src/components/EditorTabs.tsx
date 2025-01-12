import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface EditorTab {
  id: string;
  path: string;
  isDirty: boolean;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
}) => {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex overflow-x-auto border-b border-border/40">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const fileName = tab.path.split('/').pop();

        return (
          <div
            key={tab.id}
            className={cn(
              'group flex items-center h-9 px-4 border-r border-border/40 cursor-pointer select-none',
              isActive ? 'bg-accent/50' : 'hover:bg-accent/30'
            )}
            onClick={() => onTabSelect(tab.id)}
          >
            <span className="text-sm">
              {fileName}
              {tab.isDirty && ' •'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default EditorTabs;
