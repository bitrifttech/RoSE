const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');
const treeKill = require('tree-kill');
const WebSocket = require('../node_modules/ws');
const os = require('os');
const pty = require('node-pty-prebuilt-multiarch');
const dotenv = require('dotenv');
const openaiRoutes = require('./openai-routes');
const morgan = require('morgan');
const logger = require('./utils/logger');
const archiver = require('archiver');
const multer = require('multer');
const AdmZip = require('adm-zip');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Ensure logs directory exists
fs.ensureDirSync(path.join(__dirname, 'logs'));

function createApp() {
    const app = express();
    const port = process.env.PORT || 4000;
    let server = null;
    let childProcess = null;
    let wss = null;
    let sharedTerm = null;
    const connectedClients = new Set();

    // Add response time tracking
    app.use((req, res, next) => {
        const startTime = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            logger.info('Request completed', {
                method: req.method,
                url: req.originalUrl,
                duration: `${duration}ms`,
                status: res.statusCode
            });
        });
        next();
    });

    // CORS middleware
    app.use((req, res, next) => {
        const allowedOrigins = ['http://127.0.0.1:8090', 'http://localhost:8090'];
        const origin = req.headers.origin;
        
        logger.debug('Processing CORS', { origin, allowedOrigins });
        
        if (allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
        
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    // Basic middleware
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

    // Add Morgan HTTP request logging
    app.use(morgan('combined', { stream: logger.stream }));

    // Error handling middleware - must be last
    app.use((err, req, res, next) => {
        logger.logError(err, req);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // Mount OpenAI-compatible routes
    app.use('/', openaiRoutes);

    // Constants
    const APP_DIR = path.join(__dirname, '../app');
    const WORKSPACE_DIR = APP_DIR;
    const upload = multer({ dest: os.tmpdir() });

    // Ensure app directory exists
    fs.ensureDirSync(APP_DIR);
    logger.info('App directory ensured', { path: APP_DIR });

    // File Operations
    app.get('/files/*', async (req, res, next) => {
        try {
            const relativePath = req.params[0] || '';
            const fullPath = path.join(APP_DIR, relativePath);
            
            logger.logRequest(req, { relativePath, fullPath });

            if (!fullPath.startsWith(APP_DIR)) {
                logger.warn('Access denied: Path outside app directory', { path: fullPath });
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

                logger.info('Directory listing successful', { 
                    path: relativePath, 
                    fileCount: files.length 
                });
                
                res.json(fileDetails);
            } else {
                const content = await fs.readFile(fullPath, 'utf8');
                logger.info('File read successful', { 
                    path: relativePath, 
                    size: stats.size 
                });
                res.json({ content });
            }
        } catch (error) {
            next(error);
        }
    });

    app.post('/files/*', async (req, res) => {
        try {
            const relativePath = req.params[0];
            const fullPath = path.join(APP_DIR, relativePath);
            
            logger.logRequest(req, { relativePath, fullPath });

            if (!fullPath.startsWith(APP_DIR)) {
                logger.warn('Access denied: Path outside app directory', { path: fullPath });
                return res.status(403).json({ error: 'Access denied: Path outside app directory' });
            }

            const { content, isDirectory } = req.body;

            if (isDirectory) {
                await fs.ensureDir(fullPath);
            } else {
                await fs.ensureFile(fullPath);
                await fs.writeFile(fullPath, content);
            }
            
            logger.info('File created successfully', { 
                path: relativePath, 
                isDirectory 
            });
            
            res.json({ message: 'Created successfully' });
        } catch (error) {
            logger.logError(error, req);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.put('/files/*', async (req, res) => {
        try {
            const relativePath = req.params[0];
            const fullPath = path.join(APP_DIR, relativePath);
            
            logger.logRequest(req, { relativePath, fullPath });

            if (!fullPath.startsWith(APP_DIR)) {
                logger.warn('Access denied: Path outside app directory', { path: fullPath });
                return res.status(403).json({ error: 'Access denied: Path outside app directory' });
            }

            const { content } = req.body;
            await fs.writeFile(fullPath, content);
            logger.info('File updated successfully', { 
                path: relativePath, 
                size: content.length 
            });
            res.json({ message: 'Updated successfully' });
        } catch (error) {
            logger.logError(error, req);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.delete('/files/*', async (req, res) => {
        try {
            const relativePath = req.params[0];
            const fullPath = path.join(APP_DIR, relativePath);
            
            logger.logRequest(req, { relativePath, fullPath });

            if (!fullPath.startsWith(APP_DIR)) {
                logger.warn('Access denied: Path outside app directory', { path: fullPath });
                return res.status(403).json({ error: 'Access denied: Path outside app directory' });
            }

            await fs.remove(fullPath);
            logger.info('File deleted successfully', { 
                path: relativePath 
            });
            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            logger.logError(error, req);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Upload and restore app
    app.post('/upload/app', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Check if it's a zip file
            if (!req.file.originalname.endsWith('.zip')) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'File must be a zip archive' });
            }

            // Create a temporary directory for extraction
            const tempDir = path.join(os.tmpdir(), 'app-upload-' + Date.now());
            await fs.ensureDir(tempDir);

            try {
                // Extract the zip file to temp directory first
                const zip = new AdmZip(req.file.path);
                zip.extractAllTo(tempDir, true);

                // Clear the entire app directory except .git if it exists
                logger.info('Clearing app directory...');
                const items = await fs.readdir(APP_DIR);
                for (const item of items) {
                    if (item === '.git') continue;  // Preserve git history if it exists
                    const itemPath = path.join(APP_DIR, item);
                    await fs.remove(itemPath);
                }
                logger.info('App directory cleared');

                // Copy all files except node_modules from temp to app directory
                await fs.copy(tempDir, APP_DIR, {
                    filter: (src) => {
                        const relativePath = path.relative(tempDir, src);
                        return !relativePath.startsWith('node_modules') && 
                               !relativePath.startsWith('.next');
                    }
                });

                // Install dependencies
                await execAsync('cd /usr/src/app/app && npm install', {
                    env: { ...process.env, NODE_ENV: 'development' }
                });
                logger.info('Dependencies installed');

                logger.info('App restored successfully');
                res.json({ message: 'App restored successfully' });
            } finally {
                // Clean up temporary files
                await fs.remove(tempDir);
                fs.unlinkSync(req.file.path);
            }
        } catch (error) {
            logger.error('Error restoring app', { error });
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ error: 'Failed to restore app' });
        }
    });

    // Download app directory as zip
    app.get('/download/app', async (req, res) => {
        try {
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            // Set the headers
            res.attachment('app.zip');

            // Pipe archive data to the response
            archive.pipe(res);

            // Function to recursively add files
            const addFilesToArchive = async (currentPath, relativePath = '') => {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    const archivePath = path.join(relativePath, entry.name);
                    
                    // Skip node_modules and .next directories
                    if (entry.name === 'node_modules' || entry.name === '.next') {
                        continue;
                    }
                    
                    if (entry.isDirectory()) {
                        await addFilesToArchive(fullPath, archivePath);
                    } else {
                        const stat = await fs.stat(fullPath);
                        archive.append(fs.createReadStream(fullPath), {
                            name: archivePath,
                            date: stat.mtime,
                            mode: stat.mode
                        });
                    }
                }
            };

            // Start adding files from the app directory
            await addFilesToArchive(APP_DIR);

            // Finalize the archive
            await archive.finalize();

            logger.info('App directory downloaded successfully');
        } catch (error) {
            logger.error('Error creating zip file', { error });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error creating zip file' });
            }
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
                logger.warn('Invalid path', { 
                    sourcePath: absoluteSourcePath, 
                    targetPath: absoluteTargetPath 
                });
                return res.status(403).send('Invalid path');
            }

            // Check if source exists and target parent directory exists
            if (!fs.existsSync(absoluteSourcePath)) {
                logger.warn('Source file not found', { 
                    path: absoluteSourcePath 
                });
                return res.status(404).send('Source file not found');
            }

            const targetDir = path.dirname(absoluteTargetPath);
            if (!fs.existsSync(targetDir)) {
                logger.warn('Target directory not found', { 
                    path: targetDir 
                });
                return res.status(404).send('Target directory not found');
            }

            // Move the file
            await fs.promises.rename(absoluteSourcePath, absoluteTargetPath);
            logger.info('File moved successfully', { 
                sourcePath: absoluteSourcePath, 
                targetPath: absoluteTargetPath 
            });
            res.sendStatus(200);
        } catch (error) {
            logger.logError(error, req);
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
                logger.warn('Invalid path', { 
                    path: absolutePath 
                });
                return res.status(403).send('Invalid path');
            }

            // Check if path exists
            if (!fs.existsSync(absolutePath)) {
                logger.warn('File not found', { 
                    path: absolutePath 
                });
                return res.status(404).send('File not found');
            }

            // Check if it's a directory
            const stats = await fs.promises.stat(absolutePath);
            if (stats.isDirectory()) {
                await fs.promises.rm(absolutePath, { recursive: true });
            } else {
                await fs.promises.unlink(absolutePath);
            }

            logger.info('File deleted successfully', { 
                path: absolutePath 
            });
            res.sendStatus(200);
        } catch (error) {
            logger.logError(error, req);
            res.status(500).send(error.message);
        }
    });

    // Execute command in terminal
    app.post('/execute', async (req, res) => {
        try {
            const { command } = req.body;
            if (!command) {
                return res.status(400).json({ error: 'Command is required' });
            }

            logger.info('Executing command:', { command });

            if (!sharedTerm) {
                return res.status(400).json({ error: 'No active terminal session found' });
            }

            // Create a promise to collect output
            const outputPromise = new Promise((resolve, reject) => {
                let output = '';
                let timeout;
                let commandComplete = false;

                // Handler for terminal output
                const dataHandler = (data) => {
                    output += data;
                    // Reset timeout on new data
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        if (!commandComplete) {
                            commandComplete = true;
                            cleanup();
                            resolve(output);
                        }
                    }, 1000); // Wait 1 second after last output
                };

                // Cleanup function
                const cleanup = () => {
                    sharedTerm.removeListener('data', dataHandler);
                    clearTimeout(timeout);
                };

                // Set up timeout for command completion
                timeout = setTimeout(() => {
                    if (!commandComplete) {
                        commandComplete = true;
                        cleanup();
                        resolve(output);
                    }
                }, 5000); // Maximum 5 second wait

                // Listen for output
                sharedTerm.on('data', dataHandler);

                // Write command to terminal with proper line ending
                // Ensure the command is properly escaped and wrapped
                const wrappedCommand = `${command.replace(/"/g, '\\"')}\r`;
                sharedTerm.write(wrappedCommand);
            });

            // Wait for command output
            const output = await outputPromise;

            logger.info('Command executed successfully', { 
                command, 
                outputLength: output.length 
            });

            // Clean the output by removing the command echo and terminal control characters
            const cleanOutput = output
                .replace(new RegExp(`^${command}\r\n`), '') // Remove command echo
                .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')     // Remove ANSI escape sequences
                .trim();

            res.json({ 
                success: true, 
                command,
                output: cleanOutput
            });

        } catch (error) {
            logger.error('Error executing command:', error);
            res.status(500).json({ 
                error: 'Failed to execute command',
                details: error.message
            });
        }
    });

    // App Server Management
    app.post('/server/start', (req, res) => {
        if (childProcess) {
            logger.warn('Server is already running');
            return res.status(400).json({ error: 'Server is already running' });
        }

        const { command = 'npm', args = ['start'] } = req.body;
        childProcess = spawn(command, args, { cwd: APP_DIR });

        childProcess.stdout.on('data', (data) => {
            logger.info('App output', { 
                data: data.toString() 
            });
        });

        childProcess.stderr.on('data', (data) => {
            logger.error('App error', { 
                data: data.toString() 
            });
        });

        childProcess.on('close', (code) => {
            logger.info('App process exited', { 
                code 
            });
            childProcess = null;
        });

        logger.info('Server started', { 
            command, 
            args 
        });
        res.json({ message: 'Server started' });
    });

    app.post('/server/stop', (req, res) => {
        if (!childProcess) {
            logger.warn('No server is running');
            return res.status(400).json({ error: 'No server is running' });
        }

        treeKill(childProcess.pid, 'SIGTERM', (err) => {
            if (err) {
                logger.logError(err, req);
                return res.status(500).json({ error: 'Failed to stop server' });
            }
            childProcess = null;
            logger.info('Server stopped');
            res.json({ message: 'Server stopped' });
        });
    });

    app.get('/server/status', (req, res) => {
        logger.logRequest(req);
        res.json({ 
            running: childProcess !== null,
            pid: childProcess ? childProcess.pid : null
        });
    });

    const startServer = (testPort) => {
        return new Promise((resolve) => {
            const listenPort = testPort || port;
            server = app.listen(listenPort, () => {
                logger.info('Server running on port ' + listenPort);
                
                // Initialize WebSocket server
                wss = new WebSocket.Server({ server });
                
                // Create shared terminal
                const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
                sharedTerm = pty.spawn(shell, [], {
                    name: 'xterm-color',
                    cols: 80,
                    rows: 24,
                    cwd: APP_DIR,
                    env: process.env
                });

                // Terminal -> All WebSocket clients
                sharedTerm.onData(data => {
                    const message = JSON.stringify({ type: 'output', data });
                    for (const client of connectedClients) {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(message);
                        }
                    }
                });
                
                wss.on('connection', (ws) => {
                    logger.info('New shell connection');
                    connectedClients.add(ws);

                    // WebSocket -> Terminal
                    ws.on('message', (message) => {
                        try {
                            const { type, data } = JSON.parse(message);
                            switch (type) {
                                case 'input':
                                    sharedTerm.write(data);
                                    break;
                                case 'resize':
                                    sharedTerm.resize(data.cols, data.rows);
                                    break;
                            }
                        } catch (err) {
                            logger.logError(err, req);
                        }
                    });

                    // Handle close
                    ws.on('close', () => {
                        logger.info('Shell connection closed');
                        connectedClients.delete(ws);
                    });

                    // Send initial message
                    ws.send(JSON.stringify({ 
                        type: 'connected', 
                        data: { 
                            shell,
                            cwd: APP_DIR,
                            shared: true
                        } 
                    }));
                });

                resolve(server);
            });
        });
    };

    const stopServer = () => {
        return new Promise((resolve) => {
            // Close all WebSocket connections
            for (const client of connectedClients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.close();
                }
            }
            connectedClients.clear();

            // Kill shared terminal
            if (sharedTerm) {
                sharedTerm.kill();
                sharedTerm = null;
            }

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
