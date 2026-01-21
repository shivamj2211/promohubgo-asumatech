FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma
RUN npm run db:generate

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
