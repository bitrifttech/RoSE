import React, { useState, useCallback, useEffect } from 'react';
import { readFile, listFiles, createFile, updateFile } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, ChevronRight, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import FileContextMenu from './FileContextMenu';
import { getFileIcon, sortFiles, matchesFilter, shouldIgnore } from '@/utils/files';
import { useToast } from './ui/use-toast';

interface FileExplorerProps {
  onFileSelect: (content: string, path: string) => void;
}

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  isExpanded?: boolean;
  children?: FileItem[];
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFiles = useCallback(async (path: string = '') => {
    try {
      const items = await listFiles(path);
      const filteredItems = items
        .filter(item => !shouldIgnore(item.name))
        .map(item => ({
          ...item,
          path: path ? `${path}/${item.name}` : item.name,
          children: item.isDirectory ? [] : undefined,
        }));
      return sortFiles(filteredItems);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to fetch files');
      return [];
    }
  }, []);

  const loadDirectory = useCallback(async (path: string) => {
    const children = await fetchFiles(path);
    setFiles(prevFiles => {
      const updateChildren = (items: FileItem[]): FileItem[] => {
        return items.map(item => {
          if (item.path === path) {
            return { ...item, children };
          }
          if (item.children) {
            return { ...item, children: updateChildren(item.children) };
          }
          return item;
        });
      };
      return updateChildren(prevFiles);
    });
  }, [fetchFiles]);

  const handleFileClick = useCallback(async (file: FileItem) => {
    if (file.isDirectory) {
      const isExpanded = expandedPaths.has(file.path);
      if (isExpanded) {
        expandedPaths.delete(file.path);
        setExpandedPaths(new Set(expandedPaths));
      } else {
        setExpandedPaths(new Set([...expandedPaths, file.path]));
        await loadDirectory(file.path);
      }
    } else {
      try {
        const content = await readFile(file.path);
        onFileSelect(content, file.path);
      } catch (err) {
        console.error('Error reading file:', err);
        setError('Failed to read file');
      }
    }
  }, [expandedPaths, loadDirectory, onFileSelect]);

  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.path);
  };

  const handleDragOver = (e: React.DragEvent, item: FileItem) => {
    e.preventDefault();
    if (item.isDirectory && draggedItem && item.path !== draggedItem.path) {
      setDragOverPath(item.path);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetItem: FileItem) => {
    e.preventDefault();
    setDragOverPath(null);

    if (!draggedItem || !targetItem.isDirectory || targetItem.path === draggedItem.path) {
      return;
    }

    try {
      const content = await readFile(draggedItem.path);
      const newPath = `${targetItem.path}/${draggedItem.name}`;
      await createFile(newPath, content);
      // Refresh both source and target directories
      await loadDirectory(targetItem.path);
      await loadDirectory(draggedItem.path.split('/').slice(0, -1).join('/'));
      toast({
        title: 'File moved',
        description: `Successfully moved ${draggedItem.name} to ${targetItem.path}`,
      });
    } catch (err) {
      console.error('Error moving file:', err);
      toast({
        title: 'Error',
        description: 'Failed to move file',
        variant: 'destructive',
      });
    }
  };

  const handleNewFile = async (path: string) => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    const filePath = `${path}/${fileName}`;
    try {
      await createFile(filePath, '');
      await loadDirectory(path);
      toast({
        title: 'File created',
        description: `Successfully created ${fileName}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create file',
        variant: 'destructive',
      });
    }
  };

  const handleNewFolder = async (path: string) => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const folderPath = `${path}/${folderName}`;
    try {
      await createFile(folderPath, '', true);
      await loadDirectory(path);
      toast({
        title: 'Folder created',
        description: `Successfully created ${folderName}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  const handleRename = async (path: string) => {
    const newName = prompt('Enter new name:');
    if (!newName) return;

    const parentPath = path.split('/').slice(0, -1).join('/');
    const newPath = `${parentPath}/${newName}`;
    try {
      const content = await readFile(path);
      await createFile(newPath, content);
      // TODO: Add delete API endpoint and call it here
      await loadDirectory(parentPath);
      toast({
        title: 'File renamed',
        description: `Successfully renamed to ${newName}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to rename file',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // TODO: Add delete API endpoint and call it
      const parentPath = path.split('/').slice(0, -1).join('/');
      await loadDirectory(parentPath);
      toast({
        title: 'Item deleted',
        description: 'Successfully deleted item',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  const renderFile = (file: FileItem, depth: number = 0) => {
    if (!matchesFilter(file.name, searchQuery)) {
      return null;
    }

    const isExpanded = expandedPaths.has(file.path);
    const { icon: Icon, color } = getFileIcon(file.name, file.isDirectory);

    return (
      <div key={file.path}>
        <FileContextMenu
          isDirectory={file.isDirectory}
          path={file.path}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onRefresh={() => loadDirectory(file.path)}
        >
          <div
            className={cn(
              'flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer select-none',
              dragOverPath === file.path && 'bg-accent/50 border-t-2 border-primary',
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => handleFileClick(file)}
            draggable
            onDragStart={(e) => handleDragStart(e, file)}
            onDragOver={(e) => handleDragOver(e, file)}
            onDrop={(e) => handleDrop(e, file)}
            onDragLeave={() => setDragOverPath(null)}
          >
            {file.isDirectory && (
              <div className="mr-1">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            )}
            <Icon className="h-4 w-4 mr-2" style={{ color }} />
            <span className="text-sm">{file.name}</span>
          </div>
        </FileContextMenu>
        {isExpanded && file.children && (
          <div>
            {file.children.map(child => renderFile(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchFiles().then(setFiles);
  }, [fetchFiles]);

  return (
    <div className="w-64 h-full flex flex-col border-r border-border/40">
      <div className="p-2 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {files.map(file => renderFile(file))}
      </div>
    </div>
  );
};

export default FileExplorer;