#!/bin/sh
set -e

echo "🔄 Waiting for PostgreSQL to be ready..."
# Wait for PostgreSQL to be ready
MAX_RETRIES=30
RETRY_INTERVAL=2
RETRIES=0

until nc -z postgres 5432 || [ $RETRIES -eq $MAX_RETRIES ]; do
  echo "⏳ Waiting for PostgreSQL to be available... ($RETRIES/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
  RETRIES=$((RETRIES+1))
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
  echo "❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts."
  exit 1
fi

echo "✅ PostgreSQL is available!"

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Database initialization completed successfully!" 