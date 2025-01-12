interface EditorTab {
  id: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}

const languageMap: Record<string, string> = {
  // Web
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'scss': 'scss',
  'less': 'less',
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'json': 'json',
  'jsonc': 'jsonc',
  
  // Configuration
  'yml': 'yaml',
  'yaml': 'yaml',
  'toml': 'toml',
  'ini': 'ini',
  'env': 'plaintext',
  
  // Markup
  'md': 'markdown',
  'mdx': 'mdx',
  'xml': 'xml',
  'svg': 'xml',
  
  // Programming Languages
  'py': 'python',
  'rs': 'rust',
  'go': 'go',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'cs': 'csharp',
  'rb': 'ruby',
  'php': 'php',
  'swift': 'swift',
  'kt': 'kotlin',
  
  // Shell Scripts
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'fish': 'shell',
  
  // Other
  'sql': 'sql',
  'graphql': 'graphql',
  'dockerfile': 'dockerfile',
};

export function getLanguageFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  
  // Special cases for files without extensions
  if (!extension || extension === path.toLowerCase()) {
    const filename = path.toLowerCase();
    if (filename === 'dockerfile') return 'dockerfile';
    if (filename === 'makefile') return 'makefile';
    if (filename.startsWith('.env')) return 'plaintext';
    return 'plaintext';
  }
  
  return languageMap[extension] || 'plaintext';
}

export function createEditorTab(path: string, content: string): EditorTab {
  return {
    id: `${path}-${Date.now()}`,
    path,
    content,
    language: getLanguageFromPath(path),
    isDirty: false,
  };
}

export function getShortcutConfig() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return {
    save: {
      key: isMac ? 'Meta+S' : 'Ctrl+S',
      command: 'editor.save',
    },
    saveAll: {
      key: isMac ? 'Meta+Alt+S' : 'Ctrl+Alt+S',
      command: 'editor.saveAll',
    },
    closeTab: {
      key: isMac ? 'Meta+W' : 'Ctrl+W',
      command: 'editor.closeTab',
    },
    nextTab: {
      key: isMac ? 'Meta+Alt+Right' : 'Ctrl+Alt+Right',
      command: 'editor.nextTab',
    },
    previousTab: {
      key: isMac ? 'Meta+Alt+Left' : 'Ctrl+Alt+Left',
      command: 'editor.previousTab',
    },
    undo: {
      key: isMac ? 'Meta+Z' : 'Ctrl+Z',
      command: 'editor.undo',
    },
    redo: {
      key: isMac ? 'Meta+Shift+Z' : 'Ctrl+Y',
      command: 'editor.redo',
    },
  };
}
