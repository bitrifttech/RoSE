// Use the dev server directly for now until we fix the proxy
const BASE_URL = 'http://127.0.0.1:8030';

export interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export async function listFiles(path: string): Promise<FileItem[]> {
  // Ensure path starts with a slash and doesn't end with one (unless it's root)
  const normalizedPath = path ? `/${path.replace(/^\/+|\/+$/g, '')}` : '/';
  const response = await fetch(`${BASE_URL}/files${normalizedPath}`, {
    headers: {
      'Accept': 'application/json',
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`);
  }
  return response.json();
}

export async function readFile(path: string): Promise<string> {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const response = await fetch(`${BASE_URL}/files/${normalizedPath}`, {
    headers: {
      'Accept': 'application/json',
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to read file: ${response.statusText}`);
  }
  const data = await response.json();
  return typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2);
}

export async function createFile(path: string, content: string, isDirectory: boolean = false): Promise<void> {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const response = await fetch(`${BASE_URL}/files/${normalizedPath}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, isDirectory }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create file: ${response.statusText}`);
  }
}

export async function updateFile(path: string, content: string): Promise<void> {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const response = await fetch(`${BASE_URL}/files/${normalizedPath}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update file: ${response.statusText}`);
  }
}

export async function deleteFile(path: string): Promise<void> {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const response = await fetch(`${BASE_URL}/files/${normalizedPath}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.statusText}`);
  }
}
