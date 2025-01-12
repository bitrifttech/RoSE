// Import the HTTP module
const http = require('http');

// Define the hostname and port
const hostname = '0.0.0.0'; // localhost
const port = 8010;

// Create the server
const server = http.createServer((req, res) => {
  res.statusCode = 200; // HTTP status code for success
  res.setHeader('Content-Type', 'text/plain'); // Response content type
  res.end('Hello, World!\n'); // Response body
});

// Start the server and listen on the specified port and hostname
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
