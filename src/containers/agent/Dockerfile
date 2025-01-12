FROM node:18

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Clean npm cache and remove any existing node modules
RUN npm cache clean --force && \
    rm -rf node_modules

# Install dependencies and rebuild node-pty
RUN npm install && \
    npm rebuild node-pty --update-binary

# Copy app source
COPY . .

# Create app directory and set permissions
RUN mkdir -p app && \
    chmod 777 app && \
    chmod -R 755 node_modules/node-pty/build && \
    # Copy xterm files to public directory
    mkdir -p public/xterm && \
    cp -r node_modules/@xterm/xterm/css/xterm.css public/xterm/ && \
    cp -r node_modules/@xterm/xterm/lib/xterm.js public/xterm/ && \
    cp -r node_modules/@xterm/addon-fit/lib/addon-fit.js public/xterm/

# Install additional runtime dependencies
RUN apt-get update && \
    apt-get install -y \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Expose the port
EXPOSE 3000
EXPOSE 8010
EXPOSE 8020
EXPOSE 8080

CMD ["npm", "start"]
