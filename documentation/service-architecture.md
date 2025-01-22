# RoSE Service Architecture

This document describes the architecture of the RoSE (Remote Operating System Environment) platform, a generative AI web-based development environment. The platform consists of multiple microservices that work together to provide a comprehensive development experience.

## Service Overview

### 1. UX Service (Frontend)
- **Container**: `ux_container`
- **Technology**: React/Vite
- **Port Mapping**: 8080:8080 (Host:Container)
- **Responsibilities**:
  - Provides the main web interface for the development environment
  - Renders the IDE-like interface with file explorer, terminal, and editor
  - Communicates with other services via API calls
- **Dependencies**:
  - Connects to dev_container for file operations and terminal access
  - Interacts with langgraph_soa for AI capabilities
  - Uses container-orchestrator for system operations

### 2. Development Container Service
- **Container**: `dev_container`
- **Technology**: Node.js
- **Port Mappings**:
  - 8010:8010 - Terminal websocket connection
  - 8020:8020 - File operations
  - 8030:4000 - Command execution
  - 8040:8080 - HTTP server
  - 3000:3000 - Development server
- **Responsibilities**:
  - Provides terminal access via websocket
  - Handles file system operations
  - Executes shell commands
  - Manages development environment
  - Provides RESTful API endpoints for:
    - File operations (CRUD)
      - GET /files/* - List directory contents or get file content
      - POST /files/* - Create new file or directory
      - PUT /files/* - Update file content
      - DELETE /files/* - Delete file or directory
    - Command execution
      - POST /execute - Execute commands in the app directory
    - Application management
      - Start/stop app server
      - Monitor app status
  - Maintains websocket connections for:
    - Real-time terminal access
    - Live file system events
    - Command output streaming
  - Provides logging and monitoring
    - Request/response logging
    - Error tracking
    - Performance monitoring
- **Dependencies**:
  - Accessed by the UX service for development operations
  - Communicates with container-orchestrator for container management
  - Integrates with system shell for command execution
  - Uses node-pty for terminal emulation

### 3. LangGraph Service
- **Container**: `langgraph_soa`
- **Technology**: Python/FastAPI
- **Port Mapping**: 8100:8000 (Host:Container)
- **Responsibilities**:
  - Provides AI capabilities via LangChain and OpenAI
  - Handles natural language processing
  - Manages AI agent interactions
  - Processes development queries and commands
  - Maintains chat history and session management
  - Provides agent tools for:
    - File system operations (read, create, update, delete)
    - Command execution in the development environment
    - File movement and organization
  - Implements a state machine for agent interactions using LangGraph
  - Processes user inputs through an AI pipeline
- **Environment Variables**:
  - Requires OPENAI_API_KEY for AI operations
- **Dependencies**:
  - Accessed by the UX service for AI features
  - Communicates with dev_container for command execution
  - Uses OpenAI's API for language processing
  - Integrates with LangChain for agent orchestration

### 4. Container Orchestrator Service
- **Container**: `container_orchestrator`
- **Technology**: Node.js
- **Port Mapping**: 8000:8080 (Host:Container)
- **Responsibilities**:
  - Manages container lifecycle
  - Handles container orchestration
  - Provides container health monitoring
  - Manages Docker operations
  - Provides RESTful API endpoints for:
    - Listing running containers
    - Starting new containers
    - Stopping existing containers
    - Monitoring container health
  - Filters and manages dev containers specifically
  - Provides real-time container status updates
- **Special Access**:
  - Requires access to Docker socket (/var/run/docker.sock)
  - Manages container networking and port mappings
- **Dependencies**:
  - Used by other services for container management
  - Provides container health information to the system
  - Integrates with Docker daemon for container operations

## Network Configuration

All services are connected via the `rose_network` bridge network, allowing for internal communication between containers while maintaining isolation from external networks.

## Service Communication Flow

1. **User Interaction Flow**:
   - User interacts with the UX interface (port 8080)
   - UX service communicates with:
     - Dev Container for file/terminal operations (ports 8010-8040)
     - LangGraph for AI processing (port 8100)
     - Container Orchestrator for system operations (port 8000)

2. **AI Processing Flow**:
   - LangGraph service receives requests from UX
   - Processes using OpenAI
   - Communicates with Dev Container for command execution
   - Returns results to UX

3. **Development Operations Flow**:
   - Dev Container handles direct development operations
   - Provides terminal access and file system operations
   - Executes commands and manages development environment
   - Communicates results back to UX

4. **System Management Flow**:
   - Container Orchestrator monitors all services
   - Manages container lifecycle
   - Handles health checks
   - Provides system-level operations

## Volume Mounts

Each service has specific volume mounts for persistence and development:
- UX Container: Mounts local `ux_container` directory and node_modules
- Dev Container: Mounts local `dev_container` directory
- LangGraph: Mounts local `langgraph_soa` directory
- Container Orchestrator: Mounts Docker socket for container management

## Health Monitoring

The Container Orchestrator service includes health checks:
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3 times before marking unhealthy
