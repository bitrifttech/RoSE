# Quick Start Guide

## Prerequisites
- Docker installed
- Node.js 18+ (for local development)
- curl or Postman (for API testing)

## Installation

### Using Docker
1. Clone the repository:
```bash
git clone <repository-url>
cd rose_app_container
```

2. Build the Docker image:
```bash
docker build -t rose_agent .
```

3. Run the container:
```bash
docker run -p 3000:3000 -p 4000:4000 -p 5000:5000 -p 6000:6000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  rose_agent
```

### Local Development
1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

## Basic Usage

### 1. Check Server Status
```bash
curl http://localhost:3000/server/status
```

### 2. List Files
```bash
curl http://localhost:3000/files/
```

### 3. Create a File
```bash
curl -X POST http://localhost:3000/files/test.txt \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, World!"}'
```

### 4. Execute a Command
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"command":"ls","args":["-la"]}'
```

## Web Terminal
1. Open a web browser
2. Navigate to `http://localhost:3000`
3. Enter the host address (e.g., "localhost:3000")
4. Click "Connect"

## Next Steps
1. Review the [REST API Documentation](../api/rest-api.md)
2. Check out the [WebSocket API](../api/websocket-api.md)
3. See [example integrations](../examples/)
