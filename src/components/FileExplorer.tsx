import React from "react";
import { Folder, File, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeItem {
  name: string;
  type: "file" | "folder";
  children?: FileTreeItem[];
  expanded?: boolean;
}

const demoFiles: FileTreeItem[] = [
  {
    name: "src",
    type: "folder",
    expanded: true,
    children: [
      {
        name: "components",
        type: "folder",
        expanded: true,
        children: [
          { name: "Button.tsx", type: "file" },
          { name: "Card.tsx", type: "file" },
          { name: "Input.tsx", type: "file" },
        ],
      },
      {
        name: "pages",
        type: "folder",
        children: [
          { name: "index.tsx", type: "file" },
          { name: "about.tsx", type: "file" },
        ],
      },
      { name: "App.tsx", type: "file" },
      { name: "main.tsx", type: "file" },
    ],
  },
  {
    name: "public",
    type: "folder",
    children: [
      { name: "favicon.ico", type: "file" },
      { name: "index.html", type: "file" },
    ],
  },
  { name: "package.json", type: "file" },
  { name: "tsconfig.json", type: "file" },
];

const FileTreeItem = ({ item, depth = 0 }: { item: FileTreeItem; depth?: number }) => {
  const [expanded, setExpanded] = React.useState(item.expanded || false);

  const toggleExpand = () => {
    if (item.type === "folder") {
      setExpanded(!expanded);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer text-sm",
          depth > 0 && "ml-4"
        )}
        onClick={toggleExpand}
      >
        {item.type === "folder" && (
          expanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />
        )}
        {item.type === "folder" ? (
          <Folder className="h-4 w-4 mr-2 text-blue-500" />
        ) : (
          <File className="h-4 w-4 mr-2 text-gray-500" />
        )}
        <span>{item.name}</span>
      </div>
      {item.type === "folder" && expanded && item.children && (
        <div>
          {item.children.map((child, index) => (
            <FileTreeItem key={index} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer = () => {
  console.log("FileExplorer rendered");
  
  return (
    <div className="h-full w-64 border-r border-border/40 bg-background overflow-y-auto">
      <div className="p-2 border-b border-border/40">
        <h3 className="font-medium">Project Files</h3>
      </div>
      <div className="p-2">
        {demoFiles.map((item, index) => (
          <FileTreeItem key={index} item={item} />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;