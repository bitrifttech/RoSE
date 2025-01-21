# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
