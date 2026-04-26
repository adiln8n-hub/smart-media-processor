FROM node:20-slim

# Install ffmpeg system package for reliable processing
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip make g++ && \
    pip3 install yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install

# Copy and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend source
COPY . .

# Cloud Run uses port 8080
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
