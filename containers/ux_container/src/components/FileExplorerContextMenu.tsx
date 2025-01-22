import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FilePlus, FolderPlus } from 'lucide-react';

interface FileExplorerContextMenuProps {
  children: React.ReactNode;
  onNewFile: () => void;
  onNewFolder: () => void;
}

const FileExplorerContextMenu: React.FC<FileExplorerContextMenuProps> = ({
  children,
  onNewFile,
  onNewFolder,
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onNewFile}>
          <FilePlus className="mr-2 h-4 w-4" />
          New File
        </ContextMenuItem>
        <ContextMenuItem onClick={onNewFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FileExplorerContextMenu;
