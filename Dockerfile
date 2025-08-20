# Multi-stage build for Theia
FROM node:18-alpine AS builder

# Install system dependencies needed for compilation
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /home/theia

# Copy package files first for better caching
COPY package*.json lerna.json yarn.lock ./
COPY configs ./configs
COPY scripts ./scripts

# Copy source packages
COPY packages ./packages
COPY dev-packages ./dev-packages
COPY examples/browser ./examples/browser

# Copy test framework
COPY test ./test

# Install dependencies
RUN npm install

# Build packages and examples
RUN npm run compile
RUN npm run build:browser

# Build test framework
WORKDIR /home/theia/test/theia-test-web
RUN npm install
RUN npm run compile

WORKDIR /home/theia/test/theia-test-cli  
RUN npm install
RUN npm run build

# Production stage  
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    libstdc++ \
    docker-cli \
    && addgroup -g 1001 -S theia \
    && adduser -S -u 1001 -G theia theia

# Set working directory
WORKDIR /home/theia

# Copy built application
COPY --from=builder --chown=theia:theia /home/theia/examples/browser ./examples/browser
COPY --from=builder --chown=theia:theia /home/theia/node_modules ./node_modules
COPY --from=builder --chown=theia:theia /home/theia/packages ./packages
COPY --from=builder --chown=theia:theia /home/theia/dev-packages ./dev-packages

# Copy test framework
COPY --from=builder --chown=theia:theia /home/theia/test ./test

# Copy plugins directory for extension testing
COPY --chown=theia:theia plugins ./plugins

# Create plugin volume mount point
RUN mkdir -p /home/project/plugins && chown theia:theia /home/project/plugins

# Switch to non-root user
USER theia

# Expose port
EXPOSE 3000

# Set environment variables
ENV SHELL=/bin/sh \
    THEIA_DEFAULT_PLUGINS=local-dir:/home/theia/plugins \
    NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start Theia
WORKDIR /home/theia/examples/browser  
CMD ["node", "/home/theia/examples/browser/lib/backend/main.js", "/home/project", "--hostname=0.0.0.0", "--port=3000"]