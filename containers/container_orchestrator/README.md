# Container Orchestrator

This service manages Docker containers and provides a database interface for the RoSE platform.

## Features

- User management (registration, authentication, profiles)
- Project management (create, update, delete)
- Container management (create, start, stop Docker containers)
- Version control (store and retrieve project versions)

## Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 16+
- PostgreSQL 16

### Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Adjust the values as needed:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `NODE_ENV`: Environment (development, production)

### Running Locally

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npx prisma generate
```

3. Run migrations:

```bash
npx prisma migrate deploy
```

4. Start the server:

```bash
npm start
```

### Running with Docker Compose

The service is configured to run as part of the RoSE platform using Docker Compose:

```bash
# From the root directory
docker-compose up -d
```

## Database Initialization

When starting for the first time, the service will:

1. Wait for the PostgreSQL database to be ready
2. Generate the Prisma client
3. Run all migrations
4. Start the server

If you encounter database initialization issues:

1. Check that PostgreSQL is running and accessible
2. Verify the `DATABASE_URL` is correct
3. Check the logs for specific error messages:

```bash
docker-compose logs container-orchestrator
```

## API Endpoints

### User Management
- `POST /api/users` - Create a new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Project Management
- `GET /api/projects` - Get all projects
- `GET /api/projects/user/:userId` - Get projects by user ID
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create a new project
- `DELETE /api/projects/:id` - Delete project

### Version Control
- `POST /api/projects/:id/versions` - Save project version
- `GET /api/projects/:id/versions` - Get project versions
- `POST /api/projects/:id/versions/:versionId/load` - Load project version

### Status
- `GET /api/status/database` - Check database connection status 