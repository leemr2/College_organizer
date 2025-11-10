import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NavigationBar } from "@/components/NavigationBar";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import ClientProvider from "@/components/ClientProvider";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
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
      <ClientProvider>
        <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Profile Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Update your profile information, class schedules, and preferences
              </p>
            </div>
            <ProfileEditor />
          </div>
        </div>
      </ClientProvider>
    </>
  );
}

