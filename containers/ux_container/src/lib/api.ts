// Use the proxy configured in vite.config.ts
const BASE_URL = '/files';
const SERVER_URL = '/server';
const DEV_CONTAINER_URL = '/dev_container';

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
  const response = await fetch(`${BASE_URL}/${normalizedPath}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.statusText}`);
  }
}

export async function moveFile(sourcePath: string, targetPath: string): Promise<void> {
  const normalizedSourcePath = sourcePath.replace(/^\/+|\/+$/g, '');
  const normalizedTargetPath = targetPath.replace(/^\/+|\/+$/g, '');
  const response = await fetch(`${BASE_URL}/${normalizedSourcePath}`, {
    method: 'PATCH',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetPath: normalizedTargetPath }),
  });
  if (!response.ok) {
    throw new Error(`Failed to move file: ${response.statusText}`);
  }
}

export async function startServer(): Promise<void> {
  try {
    const response = await fetch(`${SERVER_URL}/start`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'npm',
        args: ['run', 'dev', '--', '--port', '8080']
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start server');
    }

    // Wait for server to start
    let attempts = 0;
    const maxAttempts = 30;
    const delay = 1000;

    while (attempts < maxAttempts) {
      const status = await getServerStatus();
      if (status.running) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }

    throw new Error('Server failed to start within timeout');
  } catch (error) {
    console.error('Start server error:', error);
    throw error;
  }
}

export async function stopServer(): Promise<void> {
  try {
    const response = await fetch(`${SERVER_URL}/stop`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to stop server');
    }

    // Wait for server to stop
    let attempts = 0;
    const maxAttempts = 30;
    const delay = 1000;

    while (attempts < maxAttempts) {
      const status = await getServerStatus();
      if (!status.running) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }

    throw new Error('Server failed to stop within timeout');
  } catch (error) {
    console.error('Stop server error:', error);
    throw error;
  }
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
    
    // Only consider it running if we get a valid response with running: true
    if (!data || typeof data !== 'object') {
      return { running: false };
    }

    return { running: Boolean(data.running) };
  } catch (error) {
    console.error('Status check error:', error);
    return { running: false };
  }
}

export async function downloadApp(): Promise<void> {
  window.location.href = `${DEV_CONTAINER_URL}/download/app`;
}

export async function uploadApp(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${DEV_CONTAINER_URL}/upload/app`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload app');
  }
}
