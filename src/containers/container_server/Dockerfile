# Use Node.js as the base image
FROM node:16

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install
RUN npm install node-pty

# Copy application code
COPY . .

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
