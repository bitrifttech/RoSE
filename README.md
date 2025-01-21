# RoSE (Robust Software Engineer)

RoSE is an advanced development environment that combines AI-powered assistance with robust development tools. It provides an integrated environment for software development with real-time AI assistance, file management, and terminal access.

## System Requirements

- Docker and Docker Compose
- Node.js 20.x or later
- OpenAI API key for AI features

## Project Structure

The project consists of several Docker containers that work together:

### Main Components

1. **UX (Frontend)**
   - React/Vite application with modern UI components
   - Provides interface for file management, terminal access, and AI interactions
   - Port: 8090

2. **Dev Container**
   - Provides file operations and terminal access
   - Handles server operations and file management
   - Ports:
     - 8010: Terminal websocket
     - 8020: File operations
     - 8030: Command execution
     - 8040: HTTP server
     - 3000: Development server

3. **Container Orchestrator**
   - Manages container lifecycle and operations
   - Handles API requests and container management
   - Port: 8000

4. **LangGraph SOA**
   - AI service using LangGraph for advanced language processing
   - Provides conversational AI capabilities
   - Port: 8100

## Getting Started

1. **Environment Setup**
   ```bash
   # Clone the repository
   git clone [repository-url]
   cd RoSE

   # Copy and configure environment variables
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

2. **Start the Development Environment**
   ```bash
   # Build and start all containers
   docker compose up --build
   ```

   The application will be available at:
   - Main UI: http://localhost:8090
   - Container Orchestrator: http://localhost:8000
   - LangGraph Service: http://localhost:8100

3. **Development Workflow**
   - The frontend code is in the root directory
   - Each container's code is in `src/containers/[container-name]`
   - Changes to frontend code will hot-reload
   - Container changes require rebuilding: `docker compose up --build [container-name]`

## Container Details

### UX Container
- **Purpose**: Serves the main user interface
- **Technology**: React + Vite + TypeScript
- **Key Features**:
  - File browser and editor
  - Terminal integration
  - AI assistant interface
  - Container management UI

### Dev Container
- **Purpose**: Development environment and file operations
- **Technology**: Node.js + Express
- **Features**:
  - File system operations
  - Terminal access
  - Command execution
  - Server management

### Container Orchestrator
- **Purpose**: Container management and API gateway
- **Features**:
  - Container lifecycle management
  - API routing
  - Health monitoring

### LangGraph SOA
- **Purpose**: AI service integration
- **Technology**: Python + LangGraph
- **Features**:
  - Conversational AI
  - Code assistance
  - Context-aware responses

## Development Commands

```bash
# Start all services
docker compose up

# Rebuild and start a specific service
docker compose up --build [service-name]

# View logs for a specific service
docker compose logs -f [service-name]

# Stop all services
docker compose down
```

## Common Development Tasks

1. **Frontend Development**
   - Edit files in the root directory
   - Changes will hot-reload in the browser
   - Run `npm install` for new dependencies

2. **Container Development**
   - Edit files in `src/containers/[container-name]`
   - Rebuild container: `docker compose up --build [container-name]`

3. **Adding New Features**
   - Frontend components go in `src/components`
   - Container-specific code goes in respective container directories
   - Update `docker-compose.yml` for new services

## Troubleshooting

1. **Container Connection Issues**
   - Check container logs: `docker compose logs [service-name]`
   - Verify all ports are available
   - Ensure environment variables are set correctly

2. **File Permission Issues**
   - Check volume mounts in `docker-compose.yml`
   - Verify user permissions in containers

3. **AI Service Issues**
   - Verify OpenAI API key in `.env`
   - Check LangGraph service logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Add License Information]
