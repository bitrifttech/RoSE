# RoSE Project State Implementation Plan

This document outlines the step-by-step implementation plan for adding multi-user project support and state persistence to RoSE.

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

2. Set Up Prisma
```bash
# Install dependencies in dev_container
npm install @prisma/client prisma
npx prisma init
```

3. Create Initial Schema
```typescript
// prisma/schema.prisma
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

## Phase 2: User Management
**Estimated Time: 1 day**

1. Create User Routes in dev_container
```typescript
// src/routes/user.ts
router.post('/users', createUser);
router.get('/users/me', getCurrentUser);
router.put('/users/me/settings', updateUserSettings);
```

2. Add User Service
```typescript
// src/services/user.ts
class UserService {
  async createUser(email: string, name: string) {
    return prisma.user.create({
      data: { email, name }
    });
  }

  async getUserSettings(userId: number) {
    return prisma.userSettings.findUnique({
      where: { userId }
    });
  }
}
```

## Phase 3: Project Management
**Estimated Time: 2-3 days**

1. Modify Existing Download/Upload Routes
```typescript
// src/routes/project.ts
router.post('/projects', createProject);
router.get('/projects', listProjects);
router.get('/projects/:id', getProject);
router.post('/projects/:id/versions', saveVersion);
router.get('/projects/:id/versions/:versionId', loadVersion);
```

2. Project Service Implementation
```typescript
// src/services/project.ts
class ProjectService {
  async createProject(userId: number, name: string) {
    const workspacePath = `/usr/src/app/workspaces/user_${userId}/project_${Date.now()}`;
    
    return prisma.project.create({
      data: {
        name,
        userId,
        workspacePath
      }
    });
  }

  async saveVersion(projectId: number, message: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    // Use existing zip functionality
    const zipBuffer = await createProjectZip(project.workspacePath);
    
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

  async loadVersion(projectId: number, versionId: number) {
    const version = await prisma.projectVersion.findUnique({
      where: { id: versionId }
    });
    
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    // Use existing extract functionality
    await extractProjectZip(version.zipContent, project.workspacePath);
    
    return version;
  }
}
```

## Phase 4: Settings Management
**Estimated Time: 1 day**

1. Settings Service
```typescript
// src/services/settings.ts
class SettingsService {
  async updateProjectSettings(projectId: number, settings: any) {
    return prisma.projectSettings.upsert({
      where: { projectId },
      update: { settings },
      create: { projectId, settings }
    });
  }

  async updateUserSettings(userId: number, settings: any) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: { settings },
      create: { userId, settings }
    });
  }
}
```

## Phase 5: Frontend Integration
**Estimated Time: 2-3 days**

1. Add API Client Methods
```typescript
// src/lib/api.ts
export class Api {
  async createProject(name: string) {
    return this.post('/projects', { name });
  }

  async listProjects() {
    return this.get('/projects');
  }

  async saveProject(projectId: number, message: string) {
    return this.post(`/projects/${projectId}/versions`, { message });
  }

  async loadProject(projectId: number, versionId?: number) {
    const url = versionId 
      ? `/projects/${projectId}/versions/${versionId}`
      : `/projects/${projectId}`;
    return this.get(url);
  }
}
```

2. Add Project Management UI Components
```typescript
// src/components/ProjectList.tsx
// src/components/ProjectVersions.tsx
// src/components/ProjectSettings.tsx
```

## Implementation Order

1. **Database Setup (Day 1)**
   - Add PostgreSQL to docker-compose
   - Initialize Prisma
   - Create initial schema
   - Run migrations

2. **User Management (Day 2)**
   - Implement user routes
   - Add user service
   - Create user settings management

3. **Project Management (Days 3-4)**
   - Create project routes
   - Implement project service
   - Integrate with existing zip functionality
   - Add version management

4. **Settings Integration (Day 5)**
   - Implement settings service
   - Add project settings management
   - Add global settings management

5. **Frontend Updates (Days 6-7)**
   - Add API client methods
   - Create project management UI
   - Add settings UI
   - Integrate with existing components

## Testing Plan

1. **Unit Tests**
   - User service methods
   - Project service methods
   - Settings service methods

2. **Integration Tests**
   - Project creation flow
   - Version management
   - Settings persistence
   - User isolation

3. **End-to-End Tests**
   - Complete project lifecycle
   - Multi-user scenarios
   - Version management
   - Settings management

## Migration Plan

1. **Database Migration**
   - Create initial schema
   - Add indexes for performance
   - Set up backup strategy

2. **Code Migration**
   - Move existing file operations to project service
   - Update routes to use new services
   - Add user context to all operations

## Rollback Plan

1. **Database Rollback**
   - Keep schema versioned
   - Maintain backup of initial state
   - Document rollback procedures

2. **Code Rollback**
   - Maintain feature flags
   - Keep old routes temporarily
   - Document rollback steps

## Success Criteria

1. Users can create and manage multiple projects
2. Projects are properly isolated by user
3. Project versions are saved and loaded correctly
4. Settings are persisted and loaded properly
5. All operations maintain data integrity
6. Performance meets acceptable thresholds
