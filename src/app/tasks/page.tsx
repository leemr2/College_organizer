import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TaskList } from "@/components/tasks/TaskList";
import { NavigationBar } from "@/components/NavigationBar";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your Tasks
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and manage your tasks
            </p>
          </div>
          <TaskList />
        </div>
      </div>
    </>
  );
}

