const request = require('supertest');
const fs = require('fs-extra');
const path = require('path');
const WebSocket = require('ws');
const { createApp } = require('./server');

const APP_DIR = path.join(__dirname, '../app');
const TEST_FILE_PATH = 'test.txt';
const TEST_DIR_PATH = 'test-dir';
const TEST_FILE_CONTENT = 'Hello, World!';
const TEST_PORT = 3001;

describe('File System API', () => {
    let app;
    let stopServer;

    beforeEach(async () => {
        // Clean up app directory before each test
        await fs.emptyDir(APP_DIR);
        const instance = createApp();
        app = instance.app;
        stopServer = instance.stopServer;
    });

    afterEach(async () => {
        if (stopServer) {
            await stopServer();
        }
    });

    afterAll(async () => {
        // Final cleanup
        await fs.emptyDir(APP_DIR);
    });

    describe('GET /files/*', () => {
        it('should list directory contents', async () => {
            // Create test files
            await fs.writeFile(path.join(APP_DIR, TEST_FILE_PATH), TEST_FILE_CONTENT);
            await fs.mkdir(path.join(APP_DIR, TEST_DIR_PATH));

            const response = await request(app)
                .get('/files/');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body.find(f => f.name === TEST_FILE_PATH)).toBeTruthy();
            expect(response.body.find(f => f.name === TEST_DIR_PATH)).toBeTruthy();
        });

        it('should get file content', async () => {
            await fs.writeFile(path.join(APP_DIR, TEST_FILE_PATH), TEST_FILE_CONTENT);

            const response = await request(app)
                .get(`/files/${TEST_FILE_PATH}`);

            expect(response.status).toBe(200);
            expect(response.body.content).toBe(TEST_FILE_CONTENT);
        });

        it('should return 404 for non-existent files', async () => {
            const response = await request(app)
                .get('/files/nonexistent.txt');

            expect(response.status).toBe(404);
        });

        it('should prevent directory traversal', async () => {
            const response = await request(app)
                .get('/files/../package.json');

            expect(response.status).toBe(403);
        });
    });

    describe('POST /files/*', () => {
        it('should create a new file', async () => {
            const response = await request(app)
                .post(`/files/${TEST_FILE_PATH}`)
                .send({ content: TEST_FILE_CONTENT });

            expect(response.status).toBe(200);
            const fileContent = await fs.readFile(path.join(APP_DIR, TEST_FILE_PATH), 'utf-8');
            expect(fileContent).toBe(TEST_FILE_CONTENT);
        });

        it('should create a new directory', async () => {
            const response = await request(app)
                .post(`/files/${TEST_DIR_PATH}`)
                .send({ isDirectory: true });

            expect(response.status).toBe(200);
            const stats = await fs.stat(path.join(APP_DIR, TEST_DIR_PATH));
            expect(stats.isDirectory()).toBe(true);
        });

        it('should prevent directory traversal', async () => {
            const response = await request(app)
                .post('/files/../test.txt')
                .send({ content: TEST_FILE_CONTENT });

            expect(response.status).toBe(403);
        });
    });

    describe('PUT /files/*', () => {
        it('should update file content', async () => {
            // Create initial file
            await fs.writeFile(path.join(APP_DIR, TEST_FILE_PATH), 'Initial content');

            const newContent = 'Updated content';
            const response = await request(app)
                .put(`/files/${TEST_FILE_PATH}`)
                .send({ content: newContent });

            expect(response.status).toBe(200);
            const fileContent = await fs.readFile(path.join(APP_DIR, TEST_FILE_PATH), 'utf-8');
            expect(fileContent).toBe(newContent);
        });

        it('should prevent directory traversal', async () => {
            const response = await request(app)
                .put('/files/../test.txt')
                .send({ content: TEST_FILE_CONTENT });

            expect(response.status).toBe(403);
        });
    });

    describe('DELETE /files/*', () => {
        it('should delete a file', async () => {
            // Create test file
            await fs.writeFile(path.join(APP_DIR, TEST_FILE_PATH), TEST_FILE_CONTENT);

            const response = await request(app)
                .delete(`/files/${TEST_FILE_PATH}`);

            expect(response.status).toBe(200);
            const exists = await fs.pathExists(path.join(APP_DIR, TEST_FILE_PATH));
            expect(exists).toBe(false);
        });

        it('should delete a directory', async () => {
            // Create test directory
            await fs.mkdir(path.join(APP_DIR, TEST_DIR_PATH));

            const response = await request(app)
                .delete(`/files/${TEST_DIR_PATH}`);

            expect(response.status).toBe(200);
            const exists = await fs.pathExists(path.join(APP_DIR, TEST_DIR_PATH));
            expect(exists).toBe(false);
        });

        it('should prevent directory traversal', async () => {
            const response = await request(app)
                .delete('/files/../test.txt');

            expect(response.status).toBe(403);
        });
    });
});

describe('Command Execution API', () => {
    let app;
    let stopServer;

    beforeEach(async () => {
        const instance = createApp();
        app = instance.app;
        stopServer = instance.stopServer;
    });

    afterEach(async () => {
        if (stopServer) {
            await stopServer();
        }
    });

    it('should execute commands', async () => {
        const response = await request(app)
            .post('/execute')
            .send({ command: 'echo', args: ['test'] });

        expect(response.status).toBe(200);
        expect(response.body.stdout.trim()).toBe('test');
    });

    it('should handle command errors', async () => {
        const response = await request(app)
            .post('/execute')
            .send({ command: 'nonexistentcommand' });

        expect(response.status).toBe(500);
    });
});

describe('Server Management API', () => {
    let app;
    let stopServer;

    beforeEach(async () => {
        const instance = createApp();
        app = instance.app;
        stopServer = instance.stopServer;
    });

    afterEach(async () => {
        if (stopServer) {
            await stopServer();
        }
    });

    it('should start and stop server', async () => {
        // Create a simple test app
        await fs.writeFile(path.join(APP_DIR, 'package.json'), JSON.stringify({
            scripts: { start: 'node server.js' }
        }));
        await fs.writeFile(path.join(APP_DIR, 'server.js'), `
            const http = require('http');
            const server = http.createServer((req, res) => {
                res.end('Test server');
            });
            server.listen(3001);
        `);

        // Start server
        const startResponse = await request(app)
            .post('/server/start');
        expect(startResponse.status).toBe(200);

        // Check status
        const statusResponse = await request(app)
            .get('/server/status');
        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.running).toBe(true);

        // Stop server
        const stopResponse = await request(app)
            .post('/server/stop');
        expect(stopResponse.status).toBe(200);

        // Check status again
        const finalStatusResponse = await request(app)
            .get('/server/status');
        expect(finalStatusResponse.status).toBe(200);
        expect(finalStatusResponse.body.running).toBe(false);
    });

    it('should handle stopping non-running server', async () => {
        const response = await request(app)
            .post('/server/stop');

        expect(response.status).toBe(400);
    });
});

describe('API Documentation', () => {
    let app;
    let stopServer;

    beforeEach(async () => {
        const instance = createApp();
        app = instance.app;
        stopServer = instance.stopServer;
    });

    afterEach(async () => {
        if (stopServer) {
            await stopServer();
        }
    });

    it('should return OpenAPI documentation', async () => {
        const response = await request(app)
            .get('/api');

        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.0');
        expect(response.body.info.title).toBeTruthy();
        expect(response.body.paths).toBeTruthy();
        
        // Verify all our endpoints are documented
        expect(response.body.paths['/api']).toBeTruthy();
        expect(response.body.paths['/files/*']).toBeTruthy();
        expect(response.body.paths['/execute']).toBeTruthy();
        expect(response.body.paths['/server/start']).toBeTruthy();
        expect(response.body.paths['/server/stop']).toBeTruthy();
        expect(response.body.paths['/server/status']).toBeTruthy();

        // Verify documentation structure for a sample endpoint
        const filesEndpoint = response.body.paths['/files/*'];
        expect(filesEndpoint.get).toBeTruthy();
        expect(filesEndpoint.post).toBeTruthy();
        expect(filesEndpoint.put).toBeTruthy();
        expect(filesEndpoint.delete).toBeTruthy();

        // Verify detailed documentation for GET /files/*
        const getFiles = filesEndpoint.get;
        expect(getFiles.summary).toBeTruthy();
        expect(getFiles.description).toBeTruthy();
        expect(getFiles.parameters).toBeTruthy();
        expect(getFiles.responses).toBeTruthy();
        expect(getFiles.responses['200']).toBeTruthy();
        expect(getFiles.responses['403']).toBeTruthy();
        expect(getFiles.responses['404']).toBeTruthy();
    });
});

describe('WebSocket Shell', () => {
    let app;
    let stopServer;
    let server;
    let ws;

    beforeEach(async () => {
        const instance = createApp();
        app = instance.app;
        stopServer = instance.stopServer;
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for previous server to fully close
        server = await instance.startServer(TEST_PORT);
    });

    afterEach(async () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        if (stopServer) {
            await stopServer();
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for cleanup
    });

    it('should establish WebSocket connection and receive initial message', (done) => {
        ws = new WebSocket(`ws://localhost:${TEST_PORT}/shell`);

        ws.on('error', (error) => {
            done(error);
        });

        ws.on('open', () => {
            console.log('WebSocket connection established');
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                expect(message.type).toBe('connected');
                expect(message.data).toHaveProperty('sessionId');
                expect(message.data).toHaveProperty('shell');
                expect(message.data).toHaveProperty('cwd');
                done();
            } catch (error) {
                done(error);
            }
        });
    }, 10000);

    it('should execute commands and receive output', (done) => {
        ws = new WebSocket(`ws://localhost:${TEST_PORT}/shell`);
        let connected = false;
        let outputReceived = false;

        ws.on('error', (error) => {
            done(error);
        });

        ws.on('open', () => {
            console.log('WebSocket connection established');
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connected' && !connected) {
                    connected = true;
                    // Send a test command
                    ws.send(JSON.stringify({
                        type: 'input',
                        data: 'echo "test"\n'
                    }));
                }
                
                if (message.type === 'output' && !outputReceived) {
                    expect(message.data).toContain('test');
                    outputReceived = true;
                    done();
                }
            } catch (error) {
                done(error);
            }
        });
    }, 10000);

    it('should handle terminal resize', (done) => {
        ws = new WebSocket(`ws://localhost:${TEST_PORT}/shell`);

        ws.on('error', (error) => {
            done(error);
        });

        ws.on('open', () => {
            try {
                // Send resize command
                ws.send(JSON.stringify({
                    type: 'resize',
                    data: {
                        cols: 100,
                        rows: 30
                    }
                }));
                // If no error occurs, consider it successful
                setTimeout(done, 500);
            } catch (error) {
                done(error);
            }
        });
    }, 10000);
});

describe('Web Terminal Interface', () => {
    let app;
    let stopServer;

    beforeEach(async () => {
        const instance = createApp();
        app = instance.app;
        stopServer = instance.stopServer;
    });

    afterEach(async () => {
        if (stopServer) {
            await stopServer();
        }
    });

    it('should serve the terminal interface page', async () => {
        const response = await request(app)
            .get('/');

        expect(response.status).toBe(200);
        expect(response.type).toBe('text/html');
        expect(response.text).toContain('<!DOCTYPE html>');
        expect(response.text).toContain('Web Terminal');
        expect(response.text).toContain('xterm.min.js');
    });
});
