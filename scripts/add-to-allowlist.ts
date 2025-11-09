/**
 * Script to add an email to the allowlist
 * 
 * Usage: npx tsx scripts/add-to-allowlist.ts <email>
 * 
 * Example: npx tsx scripts/add-to-allowlist.ts user@example.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addToAllowlist(email: string) {
  try {
    // Check if already on allowlist
    const existing = await prisma.allowlist.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`✅ Email ${email} is already on the allowlist`);
      return;
    }

    // Add to allowlist
    const allowlistEntry = await prisma.allowlist.create({
      data: { email },
    });

    console.log(`✅ Successfully added ${email} to allowlist`);
    console.log(`   ID: ${allowlistEntry.id}`);
    console.log(`   Created: ${allowlistEntry.createdAt}`);
  } catch (error: any) {
    console.error('❌ Error adding email to allowlist:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.error('Usage: npx tsx scripts/add-to-allowlist.ts <email>');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

addToAllowlist(email);

