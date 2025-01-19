FROM node:18

WORKDIR /usr/src/app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create app directory and set up xterm
RUN mkdir -p app && \
    chmod 777 app && \
    mkdir -p public/xterm && \
    cp -r node_modules/@xterm/xterm/css/xterm.css public/xterm/ && \
    cp -r node_modules/@xterm/xterm/lib/xterm.js public/xterm/ && \
    cp -r node_modules/@xterm/addon-fit/lib/addon-fit.js public/xterm/

# Set default environment variables
ENV PORT=4000

# Expose ports
EXPOSE 3000
EXPOSE 4000
EXPOSE 8010
EXPOSE 8020
EXPOSE 8080

CMD ["npm", "start"]
