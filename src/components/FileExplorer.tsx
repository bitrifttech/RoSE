import React, { useEffect, useState } from "react";
import { Folder, File, ChevronRight, ChevronDown, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileItem, listFiles, createFile, deleteFile, updateFile, readFile } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "./ui/use-toast";

interface FileTreeItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  expanded?: boolean;
  children?: FileTreeItem[];
}

interface FileExplorerProps {
  onFileSelect?: (content: string, path: string) => void;
}

const FileTreeNode = ({ 
  item, 
  depth = 0, 
  onRefresh,
  onFileSelect,
}: { 
  item: FileTreeItem; 
  depth?: number;
  onRefresh: () => void;
  onFileSelect?: (content: string, path: string) => void;
}) => {
  const [expanded, setExpanded] = useState(item.expanded || false);
  const [children, setChildren] = useState<FileTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"file" | "directory">("file");

  const handleFileClick = async () => {
    if (!item.isDirectory && onFileSelect) {
      try {
        const content = await readFile(item.path);
        onFileSelect(content, item.path);
      } catch (error) {
        toast({
          title: "Error reading file",
          description: error instanceof Error ? error.message : "Failed to read file",
          variant: "destructive",
        });
      }
    }
  };

  const loadChildren = async () => {
    if (!item.isDirectory) return;
    
    try {
      setIsLoading(true);
      const files = await listFiles(item.path);
      const sortedFiles = files.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setChildren(sortedFiles.map(file => ({
        ...file,
        path: `${item.path}/${file.name}`.replace(/^\/+/, ''),
      })));
    } catch (error) {
      toast({
        title: "Error loading files",
        description: error instanceof Error ? error.message : "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && item.isDirectory) {
      loadChildren();
    }
  }, [expanded]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    
    try {
      await deleteFile(item.path);
      toast({
        title: "Deleted successfully",
        description: `${item.name} has been deleted`,
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error deleting file",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleRename = async () => {
    if (isEditing) {
      try {
        // For now, we'll implement rename as a copy + delete operation
        const oldPath = item.path;
        const newPath = item.path.replace(item.name, newName);
        
        if (item.isDirectory) {
          await createFile(newPath, "", true);
        } else {
          const content = await readFile(oldPath);
          await createFile(newPath, content);
        }
        
        await deleteFile(oldPath);
        
        toast({
          title: "Renamed successfully",
          description: `${item.name} has been renamed to ${newName}`,
        });
        onRefresh();
      } catch (error) {
        toast({
          title: "Error renaming file",
          description: error instanceof Error ? error.message : "Failed to rename file",
          variant: "destructive",
        });
      }
    }
    setIsEditing(!isEditing);
  };

  const handleCreateNew = async () => {
    if (!newItemName) return;
    
    try {
      const newPath = `${item.path}/${newItemName}`.replace(/^\/+/, '');
      await createFile(newPath, "", newItemType === "directory");
      toast({
        title: "Created successfully",
        description: `${newItemName} has been created`,
      });
      setNewItemName("");
      setShowCreateNew(false);
      if (expanded) {
        loadChildren();
      } else {
        setExpanded(true);
      }
    } catch (error) {
      toast({
        title: "Error creating file",
        description: error instanceof Error ? error.message : "Failed to create file",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 hover:bg-accent/50 group",
          depth > 0 && "ml-4"
        )}
      >
        <div 
          className="flex-1 flex items-center cursor-pointer" 
          onClick={() => {
            if (item.isDirectory) {
              setExpanded(!expanded);
            } else {
              handleFileClick();
            }
          }}
        >
          {item.isDirectory && (
            expanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />
          )}
          {item.isDirectory ? (
            <Folder className="h-4 w-4 mr-2 text-blue-500" />
          ) : (
            <File className="h-4 w-4 mr-2 text-gray-500" />
          )}
          {isEditing ? (
            <Input
              className="h-6 py-0 px-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          ) : (
            <span className="text-sm">{item.name}</span>
          )}
        </div>
        
        <div className="hidden group-hover:flex items-center gap-1">
          {isEditing ? (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRename}>
                <Save className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(false)}>
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              {item.isDirectory && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreateNew(true)}>
                  <Plus className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {showCreateNew && (
        <div className="ml-6 flex items-center gap-2 p-2">
          <Input
            className="h-6 py-0 px-1"
            placeholder="Name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
          />
          <select 
            className="h-6 text-sm border rounded"
            value={newItemType}
            onChange={(e) => setNewItemType(e.target.value as "file" | "directory")}
          >
            <option value="file">File</option>
            <option value="directory">Directory</option>
          </select>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateNew}>
            <Save className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreateNew(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {item.isDirectory && expanded && (
        <div>
          {isLoading ? (
            <div className="ml-4 py-2 text-sm text-muted-foreground">Loading...</div>
          ) : (
            children.map((child, index) => (
              <FileTreeNode 
                key={index} 
                item={child} 
                depth={depth + 1} 
                onRefresh={loadChildren}
                onFileSelect={onFileSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect }) => {
  const [rootFiles, setRootFiles] = useState<FileTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRootFiles = async () => {
    try {
      setIsLoading(true);
      const files = await listFiles("");
      const sortedFiles = files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setRootFiles(sortedFiles.map(file => ({
        ...file,
        path: file.name,
      })));
    } catch (error) {
      toast({
        title: "Error loading files",
        description: error instanceof Error ? error.message : "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRootFiles();
  }, []);

  return (
    <div className="h-full w-64 border-r border-border/40 bg-background overflow-y-auto">
      <div className="p-2 border-b border-border/40 flex items-center justify-between">
        <h3 className="font-medium">Project Files</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadRootFiles}>
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z"
            />
          </svg>
        </Button>
      </div>
      <div className="p-2">
        {isLoading ? (
          <div className="py-2 text-sm text-muted-foreground">Loading...</div>
        ) : (
          rootFiles.map((item, index) => (
            <FileTreeNode 
              key={index} 
              item={item} 
              onRefresh={loadRootFiles}
              onFileSelect={onFileSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;