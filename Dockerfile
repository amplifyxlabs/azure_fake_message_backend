FROM node:20

# Install system dependencies for canvas and ffmpeg
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install npm dependencies for production
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Application listens on process.env.PORT or 3001. Azure App Service sets PORT.
# EXPOSE 3001 is more for documentation here.
EXPOSE 3001

# Command to run the application
CMD ["npm", "start"] 