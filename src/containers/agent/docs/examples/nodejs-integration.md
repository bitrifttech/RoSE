# Node.js Integration Example

## Installation

```bash
npm install axios ws
```

## Client Implementation

```javascript
const WebSocket = require('ws');
const axios = require('axios');

class RoseClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.ws = null;
  }

  // File Operations
  async listFiles(path = '') {
    try {
      const response = await axios.get(`${this.baseUrl}/files/${path}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  async readFile(path) {
    try {
      const response = await axios.get(`${this.baseUrl}/files/${path}`);
      return response.data.content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async createFile(path, content, isDirectory = false) {
    try {
      const response = await axios.post(`${this.baseUrl}/files/${path}`, {
        content,
        isDirectory
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create file: ${error.message}`);
    }
  }

  async updateFile(path, content) {
    try {
      const response = await axios.put(`${this.baseUrl}/files/${path}`, {
        content
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update file: ${error.message}`);
    }
  }

  async deleteFile(path) {
    try {
      const response = await axios.delete(`${this.baseUrl}/files/${path}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Command Execution
  async executeCommand(command, args = []) {
    try {
      const response = await axios.post(`${this.baseUrl}/execute`, {
        command,
        args
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }

  // Server Management
  async getServerStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/server/status`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get server status: ${error.message}`);
    }
  }

  async startServer(command = 'npm', args = ['start']) {
    try {
      const response = await axios.post(`${this.baseUrl}/server/start`, {
        command,
        args
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to start server: ${error.message}`);
    }
  }

  async stopServer() {
    try {
      const response = await axios.post(`${this.baseUrl}/server/stop`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to stop server: ${error.message}`);
    }
  }

  // WebSocket Terminal
  connectShell(onData, onError) {
    this.ws = new WebSocket(`ws://${this.baseUrl.replace('http://', '')}/shell`);

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        onData(message);
      } catch (error) {
        onError(error);
      }
    });

    this.ws.on('error', onError);

    return {
      sendCommand: (command) => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'input',
            data: command
          }));
        }
      },
      resize: (cols, rows) => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'resize',
            data: { cols, rows }
          }));
        }
      },
      disconnect: () => {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
      }
    };
  }
}

module.exports = RoseClient;
```

## Usage Example

```javascript
const RoseClient = require('./rose-client');

async function example() {
  const client = new RoseClient('http://localhost:3000');

  try {
    // List files
    const files = await client.listFiles();
    console.log('Files:', files);

    // Create a file
    await client.createFile('test.txt', 'Hello, World!');

    // Execute a command
    const result = await client.executeCommand('ls', ['-la']);
    console.log('Command output:', result);

    // Connect to shell
    const shell = client.connectShell(
      (message) => console.log('Received:', message),
      (error) => console.error('Shell error:', error)
    );

    // Send command through shell
    shell.sendCommand('ls -la\n');

    // Cleanup
    setTimeout(() => {
      shell.disconnect();
    }, 5000);

  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

## Error Handling

```javascript
async function robustExample() {
  const client = new RoseClient('http://localhost:3000');

  try {
    // Check server status first
    const status = await client.getServerStatus();
    if (!status.running) {
      await client.startServer();
    }

    // Implement retry logic
    const retryOperation = async (operation, maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    };

    // Use retry logic
    const files = await retryOperation(() => client.listFiles());
    console.log('Files:', files);

  } catch (error) {
    console.error('Error:', error);
  }
}
```

## WebSocket Reconnection

```javascript
function createReconnectingShell(client, onData, onError) {
  let reconnectAttempts = 0;
  let shell;

  function connect() {
    shell = client.connectShell(
      (message) => {
        reconnectAttempts = 0;
        onData(message);
      },
      (error) => {
        onError(error);
        if (reconnectAttempts < 5) {
          reconnectAttempts++;
          setTimeout(connect, 1000 * Math.pow(2, reconnectAttempts));
        }
      }
    );
  }

  connect();
  return shell;
}
```
