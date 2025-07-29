#!/bin/bash

# S3 Commando Suite - Docker Startup Script

set -e

echo "🚀 Starting S3 Commando Suite..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ .env file created from env.example"
        echo "⚠️  Please edit .env file with your actual configuration values"
        echo "   Press Enter to continue or Ctrl+C to edit .env first..."
        read
    else
        echo "❌ env.example not found. Please create a .env file manually."
        exit 1
    fi
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
if docker-compose ps | grep -q "unhealthy"; then
    echo "⚠️  Some services are unhealthy. Check logs with: docker-compose logs"
else
    echo "✅ All services are healthy!"
fi

echo ""
echo "🎉 S3 Commando Suite is now running!"
echo ""
echo "📱 Access your application:"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3001"
echo "   Database: localhost:5432"
echo ""
echo "👤 Default admin credentials:"
echo "   Email: admin@s3commando.com"
echo "   Password: admin123"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Access database: docker-compose exec postgres psql -U s3_commando_user -d s3_commando"
echo ""
echo "⚠️  Remember to change the default admin password in production!" 