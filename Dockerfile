# Multi-stage build for Theia
FROM node:18-alpine AS builder

# Install system dependencies
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

# Install dependencies and build
RUN npm install
RUN npm run build:examples

# Production stage
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    libstdc++ \
    && addgroup -g 1001 -S theia \
    && adduser -S -u 1001 -G theia theia

# Set working directory
WORKDIR /home/theia

# Copy built application
COPY --from=builder --chown=theia:theia /home/theia/examples/browser ./examples/browser
COPY --from=builder --chown=theia:theia /home/theia/node_modules ./node_modules
COPY --from=builder --chown=theia:theia /home/theia/packages ./packages
COPY --from=builder --chown=theia:theia /home/theia/dev-packages ./dev-packages

# Copy plugins directory for extension testing
COPY --chown=theia:theia plugins ./plugins

# Switch to non-root user
USER theia

# Expose port
EXPOSE 3000

# Set environment variables
ENV SHELL=/bin/sh \
    THEIA_DEFAULT_PLUGINS=local-dir:/home/theia/plugins

# Start Theia
WORKDIR /home/theia/examples/browser
CMD ["node", "/home/theia/examples/browser/lib/backend/main.js", "/tmp", "--hostname=0.0.0.0", "--port=3000"]