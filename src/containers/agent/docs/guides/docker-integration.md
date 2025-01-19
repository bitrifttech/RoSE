# Docker Integration Guide

## Container Configuration

### Dockerfile Overview
```dockerfile
FROM node:18
WORKDIR /usr/src/app
EXPOSE 3000 4000 5000 6000
```

### Available Ports
- `3000`: Main HTTP/WebSocket server
- `4000`: Integration port
- `5000`: Integration port
- `6000`: Integration port

## Building the Container

### Basic Build
```bash
docker build -t rose_agent .
```

### Build with Custom Arguments
```bash
docker build -t rose_agent \
  --build-arg NODE_ENV=production \
  .
```

## Running the Container

### Basic Run
```bash
docker run -p 3000:3000 rose_agent
```

### Run with All Ports
```bash
docker run -p 3000:3000 -p 4000:4000 -p 5000:5000 -p 6000:6000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  rose_agent
```

### Run with Custom Configuration
```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -v /path/to/app:/usr/src/app/app \
  -v /var/run/docker.sock:/var/run/docker.sock \
  rose_agent
```

## Volume Mounts

### Application Directory
Mount your application directory:
```bash
-v /path/to/app:/usr/src/app/app
```

### Docker Socket
For container management:
```bash
-v /var/run/docker.sock:/var/run/docker.sock
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Main server port | 3000 |

## Container Management

### Check Container Status
```bash
docker ps -f name=rose_agent
```

### View Logs
```bash
docker logs rose_agent
```

### Stop Container
```bash
docker stop rose_agent
```

### Remove Container
```bash
docker rm -f rose_agent
```

## Multi-Container Setup

### Docker Compose Example
```yaml
version: '3.8'
services:
  rose_agent:
    build: .
    ports:
      - "3000:3000"
      - "4000:4000"
      - "5000:5000"
      - "6000:6000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./app:/usr/src/app/app
    environment:
      - NODE_ENV=production
```

## Best Practices

1. **Security**
   - Use specific versions for base images
   - Implement proper access controls
   - Regular security updates

2. **Performance**
   - Optimize image size
   - Use multi-stage builds
   - Implement proper caching

3. **Maintenance**
   - Regular backups
   - Monitor container health
   - Update dependencies
