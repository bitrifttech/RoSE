import { 
  FileIcon, 
  FolderIcon, 
  ImageIcon, 
  Code2Icon, 
  FileTextIcon, 
  VideoIcon, 
  Music2Icon, 
  ArchiveIcon, 
  FileIcon as DocumentIcon 
} from 'lucide-react';

export interface FileIconInfo {
  icon: any;
  color?: string;
}

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'];
const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
const archiveExtensions = ['zip', 'rar', 'tar', 'gz', '7z'];
const codeExtensions = [
  // Web
  'html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json',
  // Backend
  'py', 'java', 'rb', 'php', 'go', 'rs', 'cs',
  // Config
  'yml', 'yaml', 'toml', 'xml', 'env',
];

export function getFileIcon(path: string, isDirectory: boolean): FileIconInfo {
  if (isDirectory) {
    return { icon: FolderIcon, color: '#FFB626' };
  }

  const extension = path.split('.').pop()?.toLowerCase() || '';
  
  if (imageExtensions.includes(extension)) {
    return { icon: ImageIcon, color: '#4CAF50' };
  }
  
  if (videoExtensions.includes(extension)) {
    return { icon: VideoIcon, color: '#E91E63' };
  }
  
  if (audioExtensions.includes(extension)) {
    return { icon: Music2Icon, color: '#9C27B0' };
  }
  
  if (archiveExtensions.includes(extension)) {
    return { icon: ArchiveIcon, color: '#795548' };
  }
  
  if (codeExtensions.includes(extension)) {
    return { icon: Code2Icon, color: '#2196F3' };
  }
  
  if (extension === 'pdf') {
    return { icon: DocumentIcon, color: '#F44336' };
  }
  
  if (extension === 'txt' || extension === 'md') {
    return { icon: FileTextIcon, color: '#607D8B' };
  }
  
  return { icon: FileIcon, color: '#9E9E9E' };
}

export function sortFiles(files: any[]): any[] {
  return [...files].sort((a, b) => {
    // Directories come first
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    // Then sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

export function matchesFilter(name: string, filter: string): boolean {
  const searchTerms = filter.toLowerCase().split(' ');
  const fileName = name.toLowerCase();
  
  return searchTerms.every(term => fileName.includes(term));
}

export function shouldIgnore(path: string): boolean {
  const ignoredPatterns = [
    /^\.git$/,
    /^node_modules$/,
    /^\.DS_Store$/,
    /^\.env/,
    /^\.vscode$/,
    /^\.idea$/,
    /^\.next$/,
    /^\.cache$/,
    /^dist$/,
    /^build$/,
    /^coverage$/,
    /^\.swp$/,
    /^\.swx$/,
    /^\.sw[a-p]$/,
    /~$/,
  ];
  
  return ignoredPatterns.some(pattern => pattern.test(path));
}
