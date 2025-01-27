# RoSE Project State Implementation Plan

## Architecture Overview

The RoSE system uses a service-oriented architecture where:

1. **Container Orchestrator**
   - Manages user authentication and sessions
   - Handles project metadata and versioning
   - Stores user and project settings
   - Coordinates with dev_container for file operations
   - Manages database operations

2. **Dev Container**
   - Provides file system operations
   - Handles zip/unzip functionality
   - Manages development environment
   - Remains stateless
   - One instance per active project

3. **Database (PostgreSQL)**
   - Connected to container orchestrator
   - Stores all persistent data
   - Manages relationships between users and projects

## Phase 1: Database Integration
**Estimated Time: 1-2 days**

1. Add PostgreSQL Container
```yaml
# docker-compose.yml additions
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_USER=rose
      - POSTGRES_DB=rose_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - rose_network
```

2. Set Up Prisma in Container Orchestrator
```bash
# Install dependencies in container_orchestrator
npm install @prisma/client prisma
npx prisma init
```

3. Create Initial Schema
```typescript
// container_orchestrator/prisma/schema.prisma
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String
  createdAt DateTime  @default(now())
  projects  Project[]
  settings  UserSettings?
}

model UserSettings {
  id        Int     @id @default(autoincrement())
  user      User    @relation(fields: [userId], references: [id])
  userId    Int     @unique
  theme     String  @default("dark")
  settings  Json?
}

model Project {
  id            Int       @id @default(autoincrement())
  name          String
  description   String?
  user          User      @relation(fields: [userId], references: [id])
  userId        Int
  versions      ProjectVersion[]
  settings      ProjectSettings?
  containerId   String?   // Docker container ID when active
  workspacePath String    @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ProjectVersion {
  id          Int      @id @default(autoincrement())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   Int
  version     Int
  zipContent  Bytes
  message     String?
  createdAt   DateTime @default(now())
  isActive    Boolean  @default(false)
}

model ProjectSettings {
  id          Int     @id @default(autoincrement())
  project     Project @relation(fields: [projectId], references: [id])
  projectId   Int     @unique
  settings    Json?
}
```

## Phase 2: Container Orchestrator Updates
**Estimated Time: 2-3 days**

1. Add User Management Routes
```typescript
// container_orchestrator/src/routes/user.ts
router.post('/users', createUser);
router.get('/users/me', getCurrentUser);
router.put('/users/me/settings', updateUserSettings);
```

2. Add Project Management Routes
```typescript
// container_orchestrator/src/routes/project.ts
router.post('/projects', createProject);
router.get('/projects', listProjects);
router.post('/projects/:id/versions', saveVersion);
router.get('/projects/:id/versions/:versionId?', loadVersion);
```

3. Project Service Implementation
```typescript
// container_orchestrator/src/services/project.ts
class ProjectService {
  async createProject(userId: number, name: string) {
    // 1. Create project record
    const project = await prisma.project.create({
      data: { name, userId }
    });
    
    // 2. Create dev container
    const container = await this.containerService.createDevContainer();
    
    // 3. Update project with container ID
    return prisma.project.update({
      where: { id: project.id },
      data: { containerId: container.id }
    });
  }

  async saveVersion(projectId: number, message: string) {
    // 1. Get project and container
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    // 2. Request zip from dev container
    const zipBuffer = await this.devContainerService.createProjectZip(project.containerId);
    
    // 3. Save to database
    return prisma.projectVersion.create({
      data: {
        projectId,
        version: await this.getNextVersion(projectId),
        zipContent: zipBuffer,
        message,
        isActive: true
      }
    });
  }
}
```

## Phase 3: Dev Container Updates
**Estimated Time: 1-2 days**

1. Add Project API Endpoints
```typescript
// dev_container/src/routes/project.ts
router.post('/zip', createProjectZip);
router.post('/unzip', extractProjectZip);
```

2. Update Zip Service
```typescript
// dev_container/src/services/zip.ts
class ZipService {
  async createProjectZip() {
    // Use existing zip functionality
    return zipBuffer;
  }

  async extractProjectZip(zipBuffer: Buffer) {
    // Use existing unzip functionality
    return extractionPath;
  }
}
```

## Phase 4: Integration
**Estimated Time: 2-3 days**

1. Container Orchestrator to Dev Container Communication
```typescript
// container_orchestrator/src/services/dev-container.ts
class DevContainerService {
  async createProjectZip(containerId: string) {
    const container = await this.getContainer(containerId);
    return container.createZip();
  }

  async extractProjectZip(containerId: string, zipBuffer: Buffer) {
    const container = await this.getContainer(containerId);
    return container.extractZip(zipBuffer);
  }
}
```

2. Frontend Integration
```typescript
// ux_container/src/lib/api.ts
export class Api {
  async createProject(name: string) {
    return this.post('/projects', { name });
  }

  async saveProject(projectId: number, message: string) {
    return this.post(`/projects/${projectId}/versions`, { message });
  }
}
```

## Implementation Order

1. **Database Setup (Day 1)**
   - Add PostgreSQL to docker-compose
   - Initialize Prisma in container orchestrator
   - Create initial schema
   - Run migrations

2. **Container Orchestrator Updates (Days 2-4)**
   - Add user management
   - Add project management
   - Implement version control
   - Add settings management

3. **Dev Container Updates (Days 5-6)**
   - Add zip/unzip endpoints
   - Update file operations
   - Add container status endpoints

4. **Integration and Testing (Days 7-8)**
   - Connect all services
   - Add frontend support
   - End-to-end testing

## Success Criteria

1. Users can create and manage multiple projects
2. Projects are properly isolated in separate containers
3. Project versions are saved and loaded correctly
4. Settings are persisted and loaded properly
5. All operations maintain data integrity
6. Performance meets acceptable thresholds
