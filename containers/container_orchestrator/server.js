const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');
const prisma = require('./src/services/prisma');

const userRoutes = require('./src/routes/user');
const projectRoutes = require('./src/routes/project');

const app = express();
const PORT = 8080;
const docker = new Docker();

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.path}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Legacy container management routes

// Route: Serves a simple HTML page at "/"
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Docker Manager</title>
      <style>
        .container-list {
          margin-top: 20px;
          border: 1px solid #ccc;
          padding: 10px;
        }
        .container-item {
          margin: 10px 0;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <h1>Container Manager</h1>
      <button id="start-btn">Start Container</button>
      <button id="stop-btn" disabled>Stop Container</button>
      <button id="refresh-btn">Refresh List</button>
      <p id="status"></p>
      <div id="container-list" class="container-list">
        <h2>Running Containers</h2>
        <div id="containers"></div>
      </div>

      <script>
        let containerId = null;

        // Function to refresh container list
        async function refreshContainers() {
          try {
            const response = await fetch('/api/containers');
            if (!response.ok) {
              throw new Error('Failed to fetch containers');
            }
            const containers = await response.json();
            const containerDiv = document.getElementById('containers');
            containerDiv.innerHTML = containers.length ? '' : '<p>No containers running</p>';
            
            containers.forEach(container => {
              const div = document.createElement('div');
              div.className = 'container-item';
              div.innerHTML = 
                '<strong>ID:</strong> ' + container.id.substring(0, 12) + '<br>' +
                '<strong>Name:</strong> ' + container.name + '<br>' +
                '<strong>Status:</strong> ' + container.status + '<br>' +
                '<strong>Ports:</strong> ' + container.ports.map(p => 
                  p.internal + '->' + p.external).join(', ');
              containerDiv.appendChild(div);
            });
          } catch (err) {
            document.getElementById('containers').innerHTML = 
              '<p style="color: red;">Error: ' + err.message + '</p>';
          }
        }

        // Refresh on page load
        refreshContainers();

        // Refresh button handler
        document.getElementById('refresh-btn').addEventListener('click', refreshContainers);

        // Start Container
        document.getElementById('start-btn').addEventListener('click', async () => {
          try {
            const response = await fetch('/api/container', { method: 'POST' });
            if (!response.ok) {
              throw new Error('Failed to start container');
            }
            const data = await response.json();
            containerId = data.containerId;
            document.getElementById('status').textContent = 
              'Container started: ' + containerId;
            // Enable the "Stop Container" button
            document.getElementById('stop-btn').disabled = false;
          } catch (err) {
            document.getElementById('status').textContent = 
              'Error: ' + err.message;
          }
        });

        // Stop Container
        document.getElementById('stop-btn').addEventListener('click', async () => {
          if (!containerId) return;
          try {
            const response = await fetch('/api/container/' + containerId, { 
              method: 'DELETE'
            });
            if (!response.ok) {
              throw new Error('Failed to stop container');
            }
            document.getElementById('status').textContent = 
              'Container stopped and removed: ' + containerId;
            containerId = null;
            // Disable the "Stop Container" button
            document.getElementById('stop-btn').disabled = true;
          } catch (err) {
            document.getElementById('status').textContent = 
              'Error: ' + err.message;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Route: GET /api/containers - List all running dev_container containers
app.get('/api/containers', async (req, res) => {
  try {
    // Get all containers
    const containers = await docker.listContainers({
      all: false,  // only running containers
      filters: JSON.stringify({
        ancestor: ['rose-dev_container:latest']
      })
    });

    // Map container data to a more friendly format
    const containerList = containers.map(container => ({
      id: container.Id,
      name: container.Names[0].replace(/^\//, ''),
      status: container.Status,
      ports: container.Ports.map(port => ({
        internal: port.PrivatePort,
        external: port.PublicPort
      })),
      created: container.Created
    }));

    return res.json(containerList);
  } catch (error) {
    console.error('Error listing containers:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Route: POST /api/container - Create and start the container
app.post('/api/container', async (req, res) => {
  try {
    // Create a new Docker container (adjust parameters as needed)
    const container = await docker.createContainer({
      Image: 'rose-dev_container:latest',
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      ExposedPorts: {
        '8010/tcp': {},
        '8020/tcp': {},
        '8080/tcp': {},
        '4000/tcp': {},
        '3000/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '8010/tcp': [{ HostPort: '8010' }],
          '8020/tcp': [{ HostPort: '8020' }],
          '8080/tcp': [{ HostPort: '8040' }],
          '4000/tcp': [{ HostPort: '8030' }],
        },
      },
    });

    // Start the container
    await container.start();
    console.log('Docker container started:', container.id);

    // Inspect the container to gather connection info
    const containerInfo = await container.inspect();

    // Extract relevant details
    const containerId = containerInfo.Id;
    const containerIPAddress = containerInfo.NetworkSettings.IPAddress;
    const mappedPorts = containerInfo.NetworkSettings.Ports;

    // Respond with JSON
    return res.json({
      containerId,
      containerIPAddress,
      mappedPorts,
    });
  } catch (error) {
    console.error('Error setting up Docker container:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Route: DELETE /api/container/:containerId - Stop and remove the container
app.delete('/api/container/:containerId', async (req, res) => {
  const { containerId } = req.params;
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
    await container.remove();
    console.log('Docker container stopped and removed:', containerId);

    return res.json({ message: `Container ${containerId} stopped and removed.` });
  } catch (error) {
    console.error(`Error stopping/removing container ${containerId}:`, error);
    return res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
  console.log('[404] Not Found:', req.method, req.path);
  res.status(404).json({ error: 'Not Found' });
});

// Wait for database connection before starting server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Successfully connected to database');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

startServer();
