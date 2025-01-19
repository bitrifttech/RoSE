# Rose App Container Documentation

## Overview
Rose App Container is a containerized service that provides file system access and command execution capabilities through both REST APIs and WebSocket connections. It features a web-based terminal interface and comprehensive file management capabilities.

## Documentation Structure

### API Reference
- [REST API Documentation](api/rest-api.md) - Comprehensive REST API documentation
- [WebSocket API Documentation](api/websocket-api.md) - WebSocket endpoints and message formats

### Integration Guides
- [Quick Start Guide](guides/quick-start.md) - Get up and running quickly
- [Docker Integration](guides/docker-integration.md) - Docker setup and configuration
- [Security Guide](guides/security.md) - Security best practices and considerations

### Examples
- [Node.js Integration](examples/nodejs-integration.md) - Example Node.js client implementation
- [Python Integration](examples/python-integration.md) - Example Python client implementation

## Service Architecture
The service exposes multiple ports for different purposes:
- `3000`: Main HTTP/WebSocket server
- `4000`: Available for integration
- `5000`: Available for integration
- `6000`: Available for integration

## Getting Started
1. Check out the [Quick Start Guide](guides/quick-start.md)
2. Review the [REST API Documentation](api/rest-api.md)
3. See the [Examples](examples/) for integration code

## Support
For issues and feature requests, please use the GitHub issue tracker.
