import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function makeAdmin() {
  const email = "markrlee74@gmail.com";

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    const updated = await prisma.user.update({
      where: { email },
      data: {
        isAdmin: true,
        role: "admin",
      },
    });

    console.log(`✅ Successfully made ${email} an admin!`);
    console.log(`   User ID: ${updated.id}`);
    console.log(`   isAdmin: ${updated.isAdmin}`);
    console.log(`   role: ${updated.role}`);
  } catch (error) {
    console.error("Error making user admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();

