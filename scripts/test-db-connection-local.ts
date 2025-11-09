/**
 * Test database connection locally
 * 
 * Usage: npx tsx scripts/test-db-connection-local.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn', 'info'],
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || 'NOT SET');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test, version() as pg_version`;
    console.log('✅ Database query successful:', result);
    
    // Test User table access
    const userCount = await prisma.user.count();
    console.log(`✅ Can access User table. Total users: ${userCount}`);
    
    await prisma.$disconnect();
    console.log('✅ Connection closed successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    
    if (error.code === 'P1001') {
      console.error('\n💡 Troubleshooting tips:');
      console.error('1. Check if your Supabase project is paused');
      console.error('2. Verify your DATABASE_URL in .env file');
      console.error('3. Check if password has special characters that need URL encoding');
      console.error('4. Try getting a fresh connection string from Supabase dashboard');
      console.error('5. Check Windows Firewall or antivirus blocking the connection');
    }
    
    if (error.message?.includes('password')) {
      console.error('\n💡 Password issue detected:');
      console.error('If your password contains special characters (@, #, %, &, etc.),');
      console.error('they need to be URL-encoded in the connection string.');
    }
    
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

testConnection();

