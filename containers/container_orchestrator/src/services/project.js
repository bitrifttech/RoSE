const prisma = require('./prisma');
const dockerode = require('dockerode');
const docker = new dockerode();
const fetch = require('node-fetch');
const FormData = require('form-data');
const { Readable } = require('stream');

class ProjectService {
  async createProject(userId, name, description) {
    // Create project in database first
    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId,
        workspacePath: `/workspaces/user_${userId}/project_${Date.now()}`
      }
    });

    try {
      // Create dev container
      const container = await docker.createContainer({
        Image: 'rose-dev_container',
        name: `rose_dev_${project.id}`,
        Env: [
          `PROJECT_ID=${project.id}`,
          `USER_ID=${userId}`
        ],
        HostConfig: {
          Binds: [
            `${project.workspacePath}:/app/workspace`
          ]
        }
      });

      // Update project with container ID
      return prisma.project.update({
        where: { id: project.id },
        data: {
          containerId: container.id
        },
        include: {
          settings: true
        }
      });
    } catch (error) {
      // If container creation fails, still return the project
      console.error('Failed to create container:', error);
      return prisma.project.findUnique({
        where: { id: project.id },
        include: {
          settings: true
        }
      });
    }
  }

  async getAllProjects() {
    return prisma.project.findMany({
      include: {
        settings: true,
        user: true
      }
    });
  }

  async getProjectsByUserId(userId) {
    return prisma.project.findMany({
      where: {
        userId: parseInt(userId)
      },
      include: {
        settings: true,
        user: true
      }
    });
  }

  async getProjectById(id) {
    return prisma.project.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        settings: true,
        user: true,
        versions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async deleteProject(id) {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Stop and remove the container if it exists
    if (project.containerId) {
      try {
        const container = docker.getContainer(project.containerId);
        await container.stop();
        await container.remove();
      } catch (error) {
        console.error('Failed to remove container:', error);
        // Continue with deletion even if container removal fails
      }
    }

    // Delete project and all related data
    await prisma.project.delete({
      where: { id }
    });

    return { success: true };
  }

  async saveVersion(projectId, message) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get container
    const container = docker.getContainer(project.containerId);
    
    // Call dev container's zip endpoint
    // Implementation needed: Get zip content from dev container

    // Save version
    return prisma.projectVersion.create({
      data: {
        projectId,
        version: await this.getNextVersion(projectId),
        zipContent: Buffer.from(''), // TODO: Replace with actual zip content
        message,
        isActive: true
      }
    });
  }

  async createProjectVersion(projectId, zipContent, message = null) {
    // First verify the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get next version number
    const nextVersion = await this.getNextVersion(projectId);
    
    // Create new version with provided zip content
    const version = await prisma.projectVersion.create({
      data: {
        projectId,
        version: nextVersion,
        zipContent: zipContent,
        message: message || `Version ${nextVersion}`,
        isActive: true
      }
    });

    // Set all other versions to inactive
    await prisma.projectVersion.updateMany({
      where: {
        projectId,
        id: { not: version.id }
      },
      data: {
        isActive: false
      }
    });

    return version;
  }

  async getNextVersion(projectId) {
    const lastVersion = await prisma.projectVersion.findFirst({
      where: { 
        projectId
      },
      orderBy: { version: 'desc' }
    });

    return (lastVersion?.version ?? 0) + 1;
  }

  async loadVersion(projectId, versionId) {
    const version = await prisma.projectVersion.findUnique({
      where: { id: versionId },
      include: { project: true }
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Get container
    const container = docker.getContainer(version.project.containerId);
    
    // Call dev container's unzip endpoint
    // Implementation needed: Send zip content to dev container

    return version;
  }

  async getProjectVersions(projectId) {
    // First verify the project exists
    const project = await prisma.project.findUnique({
      where: { 
        id: parseInt(projectId) 
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all versions for this project, excluding zipContent
    return prisma.projectVersion.findMany({
      where: {
        projectId: parseInt(projectId)
      },
      select: {
        id: true,
        version: true,
        message: true,
        createdAt: true,
        isActive: true,
        projectId: true
      },
      orderBy: {
        version: 'desc'
      }
    });
  }

  async getProjectVersionByNumber(projectId, versionNumber) {
    // First verify the project exists
    const project = await prisma.project.findUnique({
      where: { 
        id: parseInt(projectId) 
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get the specific version without zipContent
    const version = await prisma.projectVersion.findFirst({
      where: {
        projectId: parseInt(projectId),
        version: parseInt(versionNumber)
      },
      select: {
        id: true,
        version: true,
        message: true,
        createdAt: true,
        isActive: true,
        projectId: true
      }
    });

    if (!version) {
      throw new Error('Version not found');
    }

    return version;
  }

  async getProjectVersionWithZip(projectId, versionNumber) {
    // First verify the project exists
    const project = await prisma.project.findUnique({
      where: { 
        id: parseInt(projectId) 
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get the specific version with zipContent
    const version = await prisma.projectVersion.findFirst({
      where: {
        projectId: parseInt(projectId),
        version: parseInt(versionNumber)
      },
      select: {
        id: true,
        version: true,
        message: true,
        createdAt: true,
        isActive: true,
        projectId: true,
        zipContent: true
      }
    });

    if (!version) {
      throw new Error('Version not found');
    }

    try {
      // Create form data
      const formData = new FormData();
      
      // Convert Buffer to Readable Stream
      const stream = Readable.from(version.zipContent);
      
      // Append the stream to form data
      formData.append('file', stream, {
        filename: 'app.zip',
        contentType: 'application/zip'
      });

      // Send to dev container
      const response = await fetch('http://dev_container:4000/upload/app', {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to upload to dev container: ${response.status} ${response.statusText}`);
      }

      // After successful restore, update active flags
      await prisma.$transaction([
        // First, set all versions for this project to inactive
        prisma.projectVersion.updateMany({
          where: {
            projectId: parseInt(projectId),
            isActive: true
          },
          data: {
            isActive: false
          }
        }),
        // Then set the restored version to active
        prisma.projectVersion.update({
          where: {
            id: version.id
          },
          data: {
            isActive: true
          }
        })
      ]);

      // Return version data without the zipContent
      const { zipContent, ...versionWithoutZip } = version;
      return {
        ...versionWithoutZip,
        restored: true,
        restoredAt: new Date().toISOString(),
        isActive: true  // Update the return value to reflect the new active state
      };

    } catch (error) {
      throw new Error(`Failed to restore version: ${error.message}`);
    }
  }
}

module.exports = new ProjectService();
