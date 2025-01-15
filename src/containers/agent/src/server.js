const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');
const treeKill = require('tree-kill');
const WebSocket = require('ws');
const os = require('os');
const pty = require('node-pty-prebuilt-multiarch');

// API Routes Documentation
const apiRoutes = {
    '/': {
        get: {
            summary: 'Web Terminal Interface',
            description: 'Returns the web terminal interface HTML page',
            responses: {
                '200': {
                    description: 'HTML page with terminal interface',
                    content: 'text/html'
                }
            }
        }
    },
    '/api': {
        get: {
            summary: 'Get API documentation',
            description: 'Returns detailed specifications for all available API routes',
            responses: {
                '200': {
                    description: 'Successful response',
                    content: 'application/json'
                }
            }
        }
    },
    '/files/*': {
        get: {
            summary: 'Get file or directory contents',
            description: 'Returns file content or directory listing for the specified path',
            parameters: {
                path: {
                    in: 'path',
                    description: 'File or directory path relative to app directory',
                    required: true,
                    type: 'string'
                }
            },
            responses: {
                '200': {
                    description: 'Successful response',
                    content: 'application/json',
                    schema: {
                        oneOf: [
                            {
                                type: 'object',
                                properties: {
                                    content: { type: 'string' }
                                }
                            },
                            {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        isDirectory: { type: 'boolean' },
                                        size: { type: 'number' },
                                        modified: { type: 'string' }
                                    }
                                }
                            }
                        ]
                    }
                },
                '403': {
                    description: 'Access denied: Path outside app directory'
                },
                '404': {
                    description: 'File or directory not found'
                }
            }
        },
        post: {
            summary: 'Create file or directory',
            description: 'Creates a new file with content or a new directory',
            parameters: {
                path: {
                    in: 'path',
                    description: 'File or directory path relative to app directory',
                    required: true,
                    type: 'string'
                }
            },
            requestBody: {
                required: true,
                content: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        content: { type: 'string' },
                        isDirectory: { type: 'boolean' }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Created successfully'
                },
                '403': {
                    description: 'Access denied: Path outside app directory'
                },
                '500': {
                    description: 'Server error'
                }
            }
        },
        put: {
            summary: 'Update file content',
            description: 'Updates the content of an existing file',
            parameters: {
                path: {
                    in: 'path',
                    description: 'File path relative to app directory',
                    required: true,
                    type: 'string'
                }
            },
            requestBody: {
                required: true,
                content: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        content: { 
                            type: 'string',
                            required: true
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Updated successfully'
                },
                '403': {
                    description: 'Access denied: Path outside app directory'
                },
                '500': {
                    description: 'Server error'
                }
            }
        },
        delete: {
            summary: 'Delete file or directory',
            description: 'Deletes the specified file or directory',
            parameters: {
                path: {
                    in: 'path',
                    description: 'File or directory path relative to app directory',
                    required: true,
                    type: 'string'
                }
            },
            responses: {
                '200': {
                    description: 'Deleted successfully'
                },
                '403': {
                    description: 'Access denied: Path outside app directory'
                },
                '500': {
                    description: 'Server error'
                }
            }
        }
    },
    '/execute': {
        post: {
            summary: 'Execute command',
            description: 'Executes a shell command in the app directory',
            requestBody: {
                required: true,
                content: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        command: {
                            type: 'string',
                            required: true,
                            description: 'Command to execute'
                        },
                        args: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Command arguments'
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Command executed successfully',
                    content: 'application/json',
                    schema: {
                        type: 'object',
                        properties: {
                            stdout: { type: 'string' },
                            stderr: { type: 'string' }
                        }
                    }
                },
                '500': {
                    description: 'Command execution failed'
                }
            }
        }
    },
    '/server/start': {
        post: {
            summary: 'Start app server',
            description: 'Starts a Node.js server in the app directory',
            requestBody: {
                content: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        command: {
                            type: 'string',
                            default: 'npm',
                            description: 'Command to start the server'
                        },
                        args: {
                            type: 'array',
                            items: { type: 'string' },
                            default: ['start'],
                            description: 'Command arguments'
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Server started successfully'
                },
                '400': {
                    description: 'Server is already running'
                },
                '500': {
                    description: 'Failed to start server'
                }
            }
        }
    },
    '/server/stop': {
        post: {
            summary: 'Stop app server',
            description: 'Stops the running Node.js server',
            responses: {
                '200': {
                    description: 'Server stopped successfully'
                },
                '400': {
                    description: 'No server is running'
                },
                '500': {
                    description: 'Failed to stop server'
                }
            }
        }
    },
    '/server/status': {
        get: {
            summary: 'Get server status',
            description: 'Returns the current status of the app server',
            responses: {
                '200': {
                    description: 'Successful response',
                    content: 'application/json',
                    schema: {
                        type: 'object',
                        properties: {
                            running: { type: 'boolean' },
                            pid: { 
                                type: ['number', 'null'],
                                description: 'Process ID if server is running'
                            }
                        }
                    }
                }
            }
        }
    },
    '/move': {
        post: {
            summary: 'Move file or directory',
            description: 'Moves a file or directory to a new location',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                sourcePath: {
                                    type: 'string',
                                    required: true,
                                    description: 'Source file or directory path relative to app directory'
                                },
                                targetPath: {
                                    type: 'string',
                                    required: true,
                                    description: 'Target path relative to app directory'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Moved successfully'
                },
                '403': {
                    description: 'Access denied: Path outside app directory'
                },
                '404': {
                    description: 'Source or target not found'
                },
                '500': {
                    description: 'Server error'
                }
            }
        }
    },
    '/delete': {
        delete: {
            summary: 'Delete file or directory',
            description: 'Deletes the specified file or directory',
            requestBody: {
                required: true,
                content: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            required: true,
                            description: 'File or directory path relative to app directory'
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Deleted successfully'
                },
                '403': {
                    description: 'Access denied: Path outside app directory'
                },
                '404': {
                    description: 'File or directory not found'
                },
                '500': {
                    description: 'Server error'
                }
            }
        }
    }
};

function createApp() {
    const app = express();
    const port = process.env.PORT || 3000;
    let server = null;
    let childProcess = null;
    let wss = null;
    const shellSessions = new Map();

    // Middleware
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

    // Add CORS middleware
    app.use((req, res, next) => {
        const allowedOrigins = ['http://127.0.0.1:8080', 'http://localhost:8080'];
        const origin = req.headers.origin;
        
        if (allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    // Constants
    const APP_DIR = path.join(__dirname, '../app');
    const WORKSPACE_DIR = APP_DIR;

    // Ensure app directory exists
    fs.ensureDirSync(APP_DIR);

    // API Documentation route
    app.get('/api', (req, res) => {
        res.json({
            openapi: '3.0.0',
            info: {
                title: 'Container File System and Command API',
                version: '1.0.0',
                description: 'API for managing files and executing commands within a container'
            },
            paths: apiRoutes
        });
    });

    // File Operations
    app.get('/files/*', async (req, res) => {
        try {
            const relativePath = req.params[0] || '';
            const fullPath = path.join(APP_DIR, relativePath);
            
            if (!fullPath.startsWith(APP_DIR)) {
                return res.status(403).json({ error: 'Access denied: Path outside app directory' });
            }

            const stats = await fs.stat(fullPath);
            
            if (stats.isDirectory()) {
                const files = await fs.readdir(fullPath);
                const fileDetails = await Promise.all(files.map(async (file) => {
                    const filePath = path.join(fullPath, file);
                    const fileStats = await fs.stat(filePath);
                    return {
                        name: file,
                        isDirectory: fileStats.isDirectory(),
                        size: fileStats.size,
                        modified: fileStats.mtime
                    };
                }));
                res.json(fileDetails);
            } else {
                const content = await fs.readFile(fullPath, 'utf-8');
                res.json({ content });
            }
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    app.post('/files/*', async (req, res) => {
        try {
            const relativePath = req.params[0];
            const fullPath = path.join(APP_DIR, relativePath);
            
            if (!fullPath.startsWith(APP_DIR)) {
                return res.status(403).json({ error: 'Access denied: Path outside app directory' });
            }

            const { content, isDirectory } = req.body;

            if (isDirectory) {
                await fs.ensureDir(fullPath);
            } else {
                await fs.ensureFile(fullPath);
                await fs.writeFile(fullPath, content);
            }
            
            res.json({ message: 'Created successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.put('/files/*', async (req, res) => {
        try {
            const relativePath = req.params[0];
            const fullPath = path.join(APP_DIR, relativePath);
            
            if (!fullPath.startsWith(APP_DIR)) {
                return res.status(403).json({ error: 'Access denied: Path outside app directory' });
            }

            const { content } = req.body;
            await fs.writeFile(fullPath, content);
            res.json({ message: 'Updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/files/*', async (req, res) => {
        try {
            const relativePath = req.params[0];
            const fullPath = path.join(APP_DIR, relativePath);
            
            if (!fullPath.startsWith(APP_DIR)) {
                return res.status(403).json({ error: 'Access denied: Path outside app directory' });
            }

            await fs.remove(fullPath);
            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Move file endpoint
    app.post('/move', async (req, res) => {
        try {
            const { sourcePath, targetPath } = req.body;
            
            // Ensure both paths are within the workspace
            const absoluteSourcePath = path.join(WORKSPACE_DIR, sourcePath);
            const absoluteTargetPath = path.join(WORKSPACE_DIR, targetPath);
            
            if (!absoluteSourcePath.startsWith(WORKSPACE_DIR) || !absoluteTargetPath.startsWith(WORKSPACE_DIR)) {
                return res.status(403).send('Invalid path');
            }

            // Check if source exists and target parent directory exists
            if (!fs.existsSync(absoluteSourcePath)) {
                return res.status(404).send('Source file not found');
            }

            const targetDir = path.dirname(absoluteTargetPath);
            if (!fs.existsSync(targetDir)) {
                return res.status(404).send('Target directory not found');
            }

            // Move the file
            await fs.promises.rename(absoluteSourcePath, absoluteTargetPath);
            res.sendStatus(200);
        } catch (error) {
            console.error('Error moving file:', error);
            res.status(500).send(error.message);
        }
    });

    // Delete file endpoint
    app.delete('/delete', async (req, res) => {
        try {
            const { path: filePath } = req.body;
            
            // Ensure path is within the workspace
            const absolutePath = path.join(WORKSPACE_DIR, filePath);
            
            if (!absolutePath.startsWith(WORKSPACE_DIR)) {
                return res.status(403).send('Invalid path');
            }

            // Check if path exists
            if (!fs.existsSync(absolutePath)) {
                return res.status(404).send('File not found');
            }

            // Check if it's a directory
            const stats = await fs.promises.stat(absolutePath);
            if (stats.isDirectory()) {
                await fs.promises.rm(absolutePath, { recursive: true });
            } else {
                await fs.promises.unlink(absolutePath);
            }

            res.sendStatus(200);
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).send(error.message);
        }
    });

    // Command Execution
    app.post('/execute', (req, res) => {
        const { command, args = [] } = req.body;
        
        const proc = spawn(command, args, { 
            cwd: APP_DIR,
            env: { ...process.env, PATH: process.env.PATH },
            shell: true
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                return res.status(500).json({ 
                    error: `Process exited with code ${code}`, 
                    stdout,
                    stderr,
                    code 
                });
            }
            res.json({ stdout, stderr });
        });

        proc.on('error', (error) => {
            res.status(500).json({ 
                error: error.message, 
                stdout,
                stderr
            });
        });
    });

    // App Server Management
    app.post('/server/start', (req, res) => {
        if (childProcess) {
            return res.status(400).json({ error: 'Server is already running' });
        }

        const { command = 'npm', args = ['start'] } = req.body;
        childProcess = spawn(command, args, { cwd: APP_DIR });

        childProcess.stdout.on('data', (data) => {
            console.log(`App output: ${data}`);
        });

        childProcess.stderr.on('data', (data) => {
            console.error(`App error: ${data}`);
        });

        childProcess.on('close', (code) => {
            console.log(`App process exited with code ${code}`);
            childProcess = null;
        });

        res.json({ message: 'Server started' });
    });

    app.post('/server/stop', (req, res) => {
        if (!childProcess) {
            return res.status(400).json({ error: 'No server is running' });
        }

        treeKill(childProcess.pid, 'SIGTERM', (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to stop server' });
            }
            childProcess = null;
            res.json({ message: 'Server stopped' });
        });
    });

    app.get('/server/status', (req, res) => {
        res.json({ 
            running: childProcess !== null,
            pid: childProcess ? childProcess.pid : null
        });
    });

    const startServer = (testPort) => {
        return new Promise((resolve) => {
            const listenPort = testPort || port;
            server = app.listen(listenPort, () => {
                console.log(`Server running on port ${listenPort}`);
                
                // Initialize WebSocket server
                wss = new WebSocket.Server({ server });
                
                wss.on('connection', (ws) => {
                    console.log('New shell connection');
                    
                    // Create terminal
                    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
                    const term = pty.spawn(shell, [], {
                        name: 'xterm-color',
                        cols: 80,
                        rows: 24,
                        cwd: APP_DIR,
                        env: process.env
                    });

                    const sessionId = Date.now().toString();
                    shellSessions.set(sessionId, { term, ws });

                    // Terminal -> WebSocket
                    term.onData(data => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'output', data }));
                        }
                    });

                    // WebSocket -> Terminal
                    ws.on('message', (message) => {
                        try {
                            const { type, data } = JSON.parse(message);
                            switch (type) {
                                case 'input':
                                    term.write(data);
                                    break;
                                case 'resize':
                                    term.resize(data.cols, data.rows);
                                    break;
                            }
                        } catch (err) {
                            console.error('Error processing shell message:', err);
                        }
                    });

                    // Handle close
                    ws.on('close', () => {
                        console.log('Shell connection closed');
                        if (shellSessions.has(sessionId)) {
                            const session = shellSessions.get(sessionId);
                            session.term.kill();
                            shellSessions.delete(sessionId);
                        }
                    });

                    // Send initial message
                    ws.send(JSON.stringify({ 
                        type: 'connected', 
                        data: { 
                            sessionId,
                            shell,
                            cwd: APP_DIR
                        } 
                    }));
                });

                resolve(server);
            });
        });
    };

    const stopServer = () => {
        return new Promise((resolve) => {
            // Close all shell sessions
            for (const session of shellSessions.values()) {
                try {
                    session.term.kill();
                    if (session.ws.readyState === WebSocket.OPEN) {
                        session.ws.close();
                    }
                } catch (err) {
                    console.error('Error closing shell session:', err);
                }
            }
            shellSessions.clear();

            if (wss) {
                wss.close();
            }

            if (server) {
                server.close(() => {
                    server = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    };

    return { app, startServer, stopServer };
}

// Create default instance
const defaultInstance = createApp();
const { app, startServer } = defaultInstance;

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { createApp };
