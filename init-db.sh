#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env file with default database password..."
    echo "DB_PASSWORD=rose_default_password" > .env
fi

# Source the .env file
source .env

# Check if postgres container is already running
if docker-compose ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}Warning: PostgreSQL container is already running${NC}"
    echo -e "This script will:"
    echo -e "  1. Keep your existing database and data"
    echo -e "  2. Apply any new migrations that haven't been run yet"
    echo -e "\nTo reset the database completely, run: docker-compose down -v first"
    
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted${NC}"
        exit 1
    fi
else
    echo "Starting PostgreSQL container..."
    docker-compose up -d postgres
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U rose
do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Check if container-orchestrator is running
if docker-compose ps container-orchestrator | grep -q "Up"; then
    echo -e "${YELLOW}container-orchestrator is already running${NC}"
else
    echo "Starting container-orchestrator..."
    docker-compose up -d container-orchestrator
fi

# Wait for container-orchestrator to be ready
echo "Waiting for container-orchestrator to be ready..."
sleep 5

# Check if there are any pending migrations
echo "Checking for pending migrations..."
PENDING_MIGRATIONS=$(docker-compose exec -T container-orchestrator npx prisma migrate status | grep -c "Pending")

if [ "$PENDING_MIGRATIONS" -gt 0 ]; then
    echo -e "${YELLOW}Found $PENDING_MIGRATIONS pending migrations${NC}"
    echo "Running database migrations..."
    docker-compose exec -T container-orchestrator npx prisma migrate deploy
    echo -e "${GREEN}Migrations complete!${NC}"
else
    echo -e "${GREEN}Database is up to date, no migrations needed${NC}"
fi

echo -e "\n${GREEN}Database initialization complete!${NC}"
echo "Your database is ready to use"
echo -e "\nUseful commands:"
echo "- View database logs: docker-compose logs postgres"
echo "- Connect to database: docker-compose exec postgres psql -U rose -d rose_db"
echo "- Reset database: docker-compose down -v && ./init-db.sh"
