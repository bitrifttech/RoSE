// Import the HTTP module
const http = require('http');

// Define the port
const port = 8080;

// Create the server
const server = http.createServer((req, res) => {
  // Set HTTP status and headers
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');

  // Serve a simple HTML page
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Simple Node App</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          margin-top: 50px;
        }
      </style>
    </head>
    <body>
      <h1>Hello, World!</h1>
      <p>Welcome to my simple Node.js web server.</p>
    </body>
    </html>
  `);
});

// Start the server and listen on the specified port
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}/`);
});
