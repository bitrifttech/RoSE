# Saving Project Files to Database

This document outlines the implementation plan for saving project files from the development container to PostgreSQL through the container orchestration system.

## Overview

The system needs to save the current state of project files to the database for version control and persistence. This is accomplished through a chain of requests:

1. UX Container triggers the save operation
2. Container Orchestrator downloads files from Dev Container
3. Files are saved as a new version in PostgreSQL

## Data Flow

```
UX Container → Container Orchestrator → Dev Container
                     ↓
                PostgreSQL
```

This design keeps the file transfer logic in the container orchestrator, which is better positioned to handle communication between containers and the database.

## Implementation Details

### 1. Frontend (UX Container)

#### API Function (`src/lib/api.ts`)
```typescript
export async function saveProjectFiles(projectId: number): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/save-files`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Failed to save project files');
  }
}
```

#### UI Component (`src/pages/ProjectDesign.tsx`)
```typescript
const handleSaveFiles = useCallback(async () => {
  setIsSaving(true);
  try {
    await saveProjectFiles(project?.id);
    toast({
      title: "Success",
      description: "Project files saved successfully",
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save project files",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
}, [project, toast]);
```

Add save button to the UI:
```typescript
<Button
  variant="default"
  size="sm"
  onClick={handleSaveFiles}
  disabled={isSaving}
>
  {isSaving ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving Files...
    </>
  ) : (
    <>
      <Save className="mr-2 h-4 w-4" />
      Save Files
    </>
  )}
</Button>
```

### 2. Container Orchestrator

#### Project Route (`src/routes/project.js`)
```javascript
// Save project files
router.post('/:id/save-files', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Download zip from dev_container
    const devContainerResponse = await fetch('http://dev_container:4000/download/app');
    if (!devContainerResponse.ok) {
      throw new Error('Failed to download app files from dev container');
    }
    
    // Get zip content as buffer
    const zipContent = await devContainerResponse.buffer();
    
    // Create new version in database
    const version = await projectService.createProjectVersion(
      Number(id),
      zipContent
    );
    
    res.json(version);
  } catch (error) {
    console.error('Error saving project files:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### Project Service (`src/services/project.js`)
```javascript
async createProjectVersion(projectId, zipContent) {
  // First verify the project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Find the latest version
  const latestVersion = await prisma.projectVersion.findFirst({
    where: { projectId: projectId },
    orderBy: { version: 'desc' },
  });
  const newVersion = (latestVersion?.version ?? 0) + 1;
  
  // Create new version
  const version = await prisma.projectVersion.create({
    data: {
      projectId: projectId,
      version: newVersion,
      zipContent: zipContent,
      isActive: true,
      message: `Version ${newVersion}`,
    },
  });
  
  // Set all other versions to inactive
  await prisma.projectVersion.updateMany({
    where: {
      projectId: projectId,
      id: { not: version.id },
    },
    data: {
      isActive: false,
    },
  });
  
  return version;
}
```

### 3. Database Schema

The existing `ProjectVersion` table in PostgreSQL already has the necessary structure:

```prisma
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
```

## Dependencies

- `node-fetch`: Required in the container orchestrator for making HTTP requests to the dev container
- `@prisma/client`: For database operations
- Express.js middleware for handling multipart/form-data

## Error Handling

The implementation includes error handling at multiple levels:

1. Frontend shows toast notifications for success/failure
2. Container orchestrator handles:
   - Failed downloads from dev container
   - Database operation failures
   - Invalid project IDs
3. Database constraints ensure data integrity

## Security Considerations

1. All internal container communication happens over the Docker network
2. No sensitive data is exposed in the UI
3. Project access is validated before saving versions
4. File contents are safely stored as binary data in PostgreSQL

## Future Improvements

1. Add version descriptions/messages
2. Implement version browsing and restoration
3. Add file diff viewing between versions
4. Add compression for zip files before storage
5. Implement selective file saving (partial saves)
