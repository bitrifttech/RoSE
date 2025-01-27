const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const projectService = require('../services/project');

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get projects by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const projects = await projectService.getProjectsByUserId(req.params.userId);
    res.json(projects);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const { userId, name, description } = req.body;
    const project = await projectService.createProject(userId, name, description);
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    await projectService.deleteProject(parseInt(req.params.id));
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Save project version
router.post('/:id/versions', async (req, res) => {
  try {
    const { message } = req.body;
    const version = await projectService.saveVersion(
      parseInt(req.params.id),
      message
    );
    res.json(version);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Load project version
router.post('/:id/versions/:versionId/load', async (req, res) => {
  try {
    const version = await projectService.loadVersion(
      parseInt(req.params.id),
      parseInt(req.params.versionId)
    );
    res.json(version);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Save project files
router.post('/:id/save-files', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Download zip from dev_container
    const devContainerResponse = await fetch('http://dev_container:4000/download/app');
    
    if (!devContainerResponse.ok) {
      throw new Error(`Failed to download app files from dev container: ${devContainerResponse.status} ${devContainerResponse.statusText}`);
    }
    
    // Get zip content as buffer
    const zipContent = await devContainerResponse.buffer();
    
    // Return info about the downloaded zip
    res.json({
      success: true,
      downloadedFromDevContainer: true,
      zipSizeBytes: zipContent.length,
      projectId: id,
      contentType: devContainerResponse.headers.get('content-type'),
      filename: devContainerResponse.headers.get('content-disposition'),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving project files:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
