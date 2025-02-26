# Use Node.js as the base image
FROM node:16

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install bcryptjs

# Generate Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY src ./src/
COPY server.js .

# Environment setup
ENV NODE_ENV=development

# Expose the port
EXPOSE 8080

# Start the server
CMD ["/bin/sh", "-c", "npx prisma migrate deploy && node server.js"]
