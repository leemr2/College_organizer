import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { NavigationBar } from "@/components/NavigationBar";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if student exists and onboarding is complete
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { onboardingComplete: true },
  });

  if (!student) {
    redirect("/onboarding");
  }

  if (!student.onboardingComplete) {
    redirect("/onboarding");
  }

  return (
    <>
      <NavigationBar />
      <ChatInterface />
    </>
  );
}

