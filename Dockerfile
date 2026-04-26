FROM node:20-slim
 
# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    make \
    g++ \
    curl \
    ca-certificates && \
    python3 -m pip install --upgrade yt-dlp --break-system-packages && \
    rm -rf /var/lib/apt/lists/*
 
WORKDIR /app
 
# Install backend dependencies
COPY package*.json ./
RUN npm install --production
 
# Copy and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
 
COPY frontend/ ./frontend/
RUN cd frontend && npm run build
 
# Copy backend source
COPY . .
 
# Railway/Cloud Run use the PORT env var
ENV PORT=5000
EXPOSE 5000
 
CMD ["node", "server.js"]
