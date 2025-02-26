const { PrismaClient } = require('@prisma/client');

// Create Prisma client with logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Add connection handling
async function connectWithRetry(maxRetries = 5, retryInterval = 5000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      console.log('✅ Successfully connected to database');
      return true;
    } catch (error) {
      retries++;
      console.error(`❌ Database connection attempt ${retries}/${maxRetries} failed:`, error.message);
      
      if (retries >= maxRetries) {
        console.error('❌ Maximum connection retries reached. Giving up.');
        return false;
      }
      
      console.log(`⏳ Retrying in ${retryInterval/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  
  return false;
}

// Try to connect immediately (but don't block exports)
connectWithRetry().catch(e => {
  console.error('Initial database connection failed:', e);
});

// Handle unexpected disconnections
prisma.$on('query', (e) => {
  if (e.message && e.message.includes('connection')) {
    console.warn('⚠️ Database connection issue detected:', e.message);
  }
});

// Export the client
module.exports = prisma;
