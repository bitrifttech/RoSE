# Nova App Container

A Node.js service that provides filesystem access and command execution capabilities within a container.

## Features

- File system operations (CRUD) within the `app` directory
- Directory listing with detailed file information
- Command execution within the container
- App server management (start/stop)

## API Endpoints

### File Operations

- `GET /files/*` - List directory contents or get file content
- `POST /files/*` - Create new file or directory
- `PUT /files/*` - Update file content
- `DELETE /files/*` - Delete file or directory

### Command Execution

- `POST /execute` - Execute a command in the app directory
  ```json
  {
    "command": "npm",
    "args": ["install", "express"]
  }
  ```

### App Server Management

- `POST /server/start` - Start the app server
- `POST /server/stop` - Stop the app server
- `GET /server/status` - Get server status

## Running the Container

1. Build the container:
   ```bash
   docker build -t nova-app-container .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 nova-app-container
   ```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```
