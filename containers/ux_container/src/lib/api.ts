// Use the proxy configured in vite.config.ts
const BASE_URL = '/files';
const SERVER_URL = '/server';

export interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export async function listFiles(path: string): Promise<FileItem[]> {
  // Ensure path starts with a slash and doesn't end with one (unless it's root)
  const normalizedPath = path ? `/${path.replace(/^\/+|\/+$/g, '')}` : '/';
  const response = await fetch(`${BASE_URL}${normalizedPath}`, {
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
  const response = await fetch(`${BASE_URL}/${normalizedPath}`, {
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
  const response = await fetch(`${BASE_URL}/${normalizedPath}`, {
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
  const response = await fetch(`${BASE_URL}/${normalizedPath}`, {
    method: 'POST',
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
  const response = await fetch(`${BASE_URL}/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete file: ${error}`);
  }
}

export async function moveFile(sourcePath: string, targetPath: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourcePath,
      targetPath,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to move file: ${error}`);
  }
}

export async function startServer(): Promise<void> {
  const response = await fetch(`${SERVER_URL}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      command: 'npm',
      args: ['run', 'dev', '--', '--port', '8080'],
      cwd: '/app'  // Use the container's app directory
    }),
  });
  
  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to start server: ${error}`);
  }

  // Wait for the server to actually start
  let retries = 5;
  while (retries > 0) {
    const status = await getServerStatus();
    if (status.running) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    retries--;
  }
  
  throw new Error('Server failed to start after multiple attempts');
}

export async function stopServer(): Promise<void> {
  const response = await fetch(`${SERVER_URL}/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to stop server: ${error}`);
  }

  // Wait for the server to actually stop
  let retries = 5;
  while (retries > 0) {
    const status = await getServerStatus();
    if (!status.running) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    retries--;
  }
  
  throw new Error('Server failed to stop after multiple attempts');
}

export async function getServerStatus(): Promise<{ running: boolean }> {
  try {
    // Try to get status from the API server
    const response = await fetch(`${SERVER_URL}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log('Status check failed:', response.status);
      return { running: false };
    }

    const data = await response.json().catch(() => null);
    console.log('Status data:', data);
    
    // Only consider it running if we get a valid pid
    if (!data || typeof data !== 'object') {
      return { running: false };
    }

    // Check if we have a valid pid
    return { running: Boolean(data.pid && data.pid > 0) };
  } catch (error) {
    console.error('Status check error:', error);
    return { running: false };
  }
}
