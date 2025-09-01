FROM node:20-alpine
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source & build
COPY . .
RUN npm run build

# Runtime
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["npm","run","start"]
