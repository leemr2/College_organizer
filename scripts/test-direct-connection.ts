/**
 * Test using DIRECT_URL instead of DATABASE_URL
 * Sometimes Direct connection works better locally than Pooler
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file manually
config({ path: resolve(process.cwd(), '.env') });

// Use DIRECT_URL if available, otherwise DATABASE_URL
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionUrl) {
  console.error('❌ Neither DIRECT_URL nor DATABASE_URL is set');
  process.exit(1);
}

console.log('🔍 Testing with:', connectionUrl.replace(/:[^:@]+@/, ':***@'));

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
});

async function testConnection() {
  try {
    console.log('Connecting...');
    await prisma.$connect();
    console.log('✅ Connected successfully!');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query successful:', result);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

testConnection();

