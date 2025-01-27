# Project State Management in RoSE

This document outlines the implementation of project state management, user workspaces, and persistence in the RoSE system.

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [User Management](#user-management)
4. [Project Management](#project-management)
5. [Chat History and Context](#chat-history-and-context)
6. [Implementation Guide](#implementation-guide)
7. [Security Considerations](#security-considerations)

## Overview

RoSE's state management system provides:
- Multi-user support with isolated workspaces
- Project versioning with chat context preservation
- Organization-level sharing and collaboration
- Efficient storage of project files and history

### Key Features
- User authentication and authorization
- Project version control
- Chat history preservation
- Workspace isolation
- Organization management
- Fine-grained access control

## Database Schema

### User Management
```typescript
model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  name          String
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  projects      Project[]
  settings      UserSettings?
  organizations OrganizationMember[]
  passwordHash  String
  lastLogin     DateTime?
  sessions      UserSession[]
}

model UserSettings {
  id              Int     @id @default(autoincrement())
  user            User    @relation(fields: [userId], references: [id])
  userId          Int     @unique
  theme           String  @default("dark")
  editorConfig    Json?
  defaultProject  Int?
  notifications   Boolean @default(true)
}

model UserSession {
  id          Int      @id @default(autoincrement())
  user        User     @relation(fields: [userId], references: [id])
  userId      Int
  token       String   @unique
  lastActive  DateTime @updatedAt
  expiresAt   DateTime
  userAgent   String?
  ipAddress   String?
}
```

### Organization Management
```typescript
model Organization {
  id          Int       @id @default(autoincrement())
  name        String
  slug        String    @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  members     OrganizationMember[]
  projects    Project[]
}

model OrganizationMember {
  id              Int           @id @default(autoincrement())
  organization    Organization  @relation(fields: [organizationId], references: [id])
  organizationId  Int
  user            User         @relation(fields: [userId], references: [id])
  userId          Int
  role            String       // 'owner', 'admin', 'member'
  joinedAt        DateTime     @default(now())

  @@unique([organizationId, userId])
}
```

### Project Management
```typescript
model Project {
  id              Int       @id @default(autoincrement())
  name            String
  description     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  user            User      @relation(fields: [userId], references: [id])
  userId          Int
  organization    Organization? @relation(fields: [organizationId], references: [id])
  organizationId  Int?
  visibility      String    @default("private")
  collaborators   ProjectCollaborator[]
  versions        ProjectVersion[]
  settings        ProjectSettings?
  chatHistory     ChatSession[]
  memories        ProjectMemory[]
  template        Boolean   @default(false)
  forkedFrom      Int?
  workspacePath   String    @unique
}

model ProjectVersion {
  id            Int         @id @default(autoincrement())
  project       Project     @relation(fields: [projectId], references: [id])
  projectId     Int
  version       Int
  zipContent    Bytes
  createdAt     DateTime    @default(now())
  message       String?
  isActive      Boolean     @default(false)
  chatSession   ChatSession? @relation(fields: [chatSessionId], references: [id])
  chatSessionId Int?
}

model ProjectSettings {
  id              Int     @id @default(autoincrement())
  project         Project @relation(fields: [projectId], references: [id])
  projectId       Int     @unique
  lastOpenFile    String?
  theme           String  @default("dark")
  lastChatSessionId Int?
  editorState     Json?
}
```

### Chat and Context Management
```typescript
model ChatSession {
  id          Int       @id @default(autoincrement())
  project     Project   @relation(fields: [projectId], references: [id])
  projectId   Int
  messages    ChatMessage[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  versions    ProjectVersion[]
}

model ChatMessage {
  id            Int         @id @default(autoincrement())
  session       ChatSession @relation(fields: [sessionId], references: [id])
  sessionId     Int
  role          String
  content       String      @db.Text
  timestamp     DateTime    @default(now())
  metadata      Json?
  toolCalls     ToolCall[]
}

model ToolCall {
  id            Int         @id @default(autoincrement())
  message       ChatMessage @relation(fields: [messageId], references: [id])
  messageId     Int
  tool          String
  parameters    Json
  result        String      @db.Text
  timestamp     DateTime    @default(now())
}

model ProjectMemory {
  id          Int      @id @default(autoincrement())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   Int
  title       String
  content     String   @db.Text
  tags        String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Implementation Guide

### 1. Database Setup

1. Add PostgreSQL to docker-compose.yml:
```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=secretpassword
      - POSTGRES_USER=rose
      - POSTGRES_DB=rose_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - rose_network
```

2. Initialize Prisma:
```bash
npm install @prisma/client prisma
npx prisma init
npx prisma generate
```

### 2. Workspace Management

#### Creating User Workspace
```typescript
async function createUserWorkspace(userId: number) {
  const workspacePath = `/usr/src/app/workspaces/user_${userId}`;
  await fs.mkdir(workspacePath, { recursive: true });
  return workspacePath;
}
```

#### Project Operations
```typescript
async function createProject(userId: number, data: CreateProjectDTO) {
  const projectPath = `/usr/src/app/workspaces/user_${userId}/project_${Date.now()}`;
  
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      userId,
      organizationId: data.organizationId,
      visibility: data.visibility,
      workspacePath: projectPath,
    }
  });
  
  await fs.mkdir(projectPath, { recursive: true });
  return project;
}

async function saveProject(projectId: number, message: string) {
  const currentSession = await prisma.chatSession.findFirst({
    where: { projectId },
    orderBy: { updatedAt: 'desc' }
  });

  const zipBuffer = await createProjectZip('/usr/src/app/app');

  return prisma.projectVersion.create({
    data: {
      projectId,
      version: latestVersion + 1,
      zipContent: zipBuffer,
      message,
      isActive: true,
      chatSessionId: currentSession.id
    }
  });
}

async function loadProject(projectId: number, versionId?: number) {
  const version = await prisma.projectVersion.findFirst({
    where: versionId ? { id: versionId } : { projectId, isActive: true },
    include: { chatSession: { include: { messages: true } } }
  });

  await extractProjectZip(version.zipContent);
  
  const newSession = await prisma.chatSession.create({
    data: {
      projectId,
      messages: {
        create: [{
          role: 'assistant',
          content: `Project restored from version ${version.version}`
        }]
      }
    }
  });

  return { version, newSession };
}
```

### 3. Chat Context Management

```typescript
async function saveChatMessage(sessionId: number, role: string, content: string, metadata: any) {
  return prisma.chatMessage.create({
    data: {
      sessionId,
      role,
      content,
      metadata
    }
  });
}

async function saveToolCall(messageId: number, tool: string, params: any, result: string) {
  return prisma.toolCall.create({
    data: {
      messageId,
      tool,
      parameters: params,
      result
    }
  });
}
```

## Security Considerations

1. **Access Control**
   - Implement role-based access control (RBAC)
   - Validate user permissions for each operation
   - Sanitize file paths to prevent directory traversal

2. **Data Protection**
   - Encrypt sensitive data in the database
   - Use secure sessions with proper expiration
   - Implement rate limiting for API endpoints

3. **Workspace Isolation**
   - Ensure projects are isolated in separate directories
   - Validate file operations stay within project boundaries
   - Clean up temporary files and directories

4. **Authentication**
   - Use secure password hashing (bcrypt)
   - Implement JWT or session-based authentication
   - Add MFA support for enhanced security

## Implementation Steps

1. **Phase 1: Database Setup**
   - Set up PostgreSQL container
   - Initialize Prisma
   - Create initial migrations
   - Set up connection pooling

2. **Phase 2: User Management**
   - Implement authentication
   - Create user workspace management
   - Set up organization support
   - Add user settings management

3. **Phase 3: Project Management**
   - Implement project CRUD operations
   - Add version control system
   - Create project templates
   - Set up collaboration features

4. **Phase 4: Chat Integration**
   - Implement chat history storage
   - Add context preservation
   - Create tool call tracking
   - Set up memory management

5. **Phase 5: UI Implementation**
   - Create project management interface
   - Add version control UI
   - Implement chat history viewer
   - Create settings management interface

## Next Steps

1. Set up PostgreSQL container and initialize database
2. Create initial Prisma schema and migrations
3. Implement basic user authentication
4. Add project workspace management
5. Integrate with existing download/upload functionality
