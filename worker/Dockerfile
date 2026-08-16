# Use Node.js 20 on Debian slim for full ffmpeg and python/yt-dlp support
FROM node:20-bookworm-slim

# Install ffmpeg, python3, pip, curl, and latest yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && pip3 install --break-system-packages -U yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build TypeScript
COPY . .
RUN npm run build

# Set environment
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start"]
