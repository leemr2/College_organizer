import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if student exists and onboarding is complete
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { onboardingComplete: true },
  });

  if (student?.onboardingComplete) {
    redirect("/chat");
  }

  return <OnboardingFlow />;
}

