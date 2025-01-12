import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Copy,
  Trash,
  FileEdit,
  FolderPlus,
  FilePlus,
  RefreshCw,
} from 'lucide-react';

interface FileContextMenuProps {
  children: React.ReactNode;
  isDirectory: boolean;
  path: string;
  onNewFile?: (path: string) => void;
  onNewFolder?: (path: string) => void;
  onRename?: (path: string) => void;
  onDelete?: (path: string) => void;
  onCopyPath?: (path: string) => void;
  onRefresh?: () => void;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({
  children,
  isDirectory,
  path,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onCopyPath,
  onRefresh,
}) => {
  const handleCopyPath = () => {
    navigator.clipboard.writeText(path);
    onCopyPath?.(path);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {isDirectory && (
          <>
            <ContextMenuItem onClick={() => onNewFile?.(path)}>
              <FilePlus className="mr-2 h-4 w-4" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onNewFolder?.(path)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={() => onRename?.(path)}>
          <FileEdit className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Path
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onDelete?.(path)}
          className="text-red-600"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
        {isDirectory && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FileContextMenu;
