import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NavigationBar } from "@/components/NavigationBar";
import { DailyGreeting } from "@/components/dashboard/DailyGreeting";
import { DailyPlanningButton } from "@/components/dashboard/DailyPlanningButton";
import { TasksButton } from "@/components/dashboard/TasksButton";
import { TodayStats } from "@/components/dashboard/TodayStats";
import { ToolsSection } from "@/components/dashboard/ToolsSection";
import { ScheduleSection } from "@/components/dashboard/ScheduleSection";
import ClientProvider from "@/components/ClientProvider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if student exists and onboarding is complete
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { onboardingComplete: true, name: true },
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            {/* Daily Greeting */}
            <DailyGreeting name={student.name || session.user.name || "there"} />

            {/* Today's Stats */}
            <TodayStats />

            {/* Daily Planning and Tasks Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
              <DailyPlanningButton />
              <TasksButton />
            </div>

            {/* Tools Section */}
            <ToolsSection />

            {/* Schedule Section */}
            <ScheduleSection />

            {/* Pro Tip */}
            <div className="mt-12 rounded-xl bg-gradient-to-r from-brandBlue-50 to-brandBlue-100 dark:from-brandBlue-900/20 dark:to-brandBlue-800/20 p-6 border border-brandBlue-200 dark:border-brandBlue-700">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 text-brandBlue-600 dark:text-brandBlue-400 flex-shrink-0 mt-0.5">
                  💡
                </div>
                <div>
                  <h4 className="font-semibold text-brandBlue-900 dark:text-brandBlue-100 mb-1">
                    Pro Tip
                  </h4>
                  <p className="text-sm text-brandBlue-700 dark:text-brandBlue-300">
                    Click the button above to start planning your day with Scout. Just tell me what you want to accomplish and I'll help you organize it!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ClientProvider>
    </>
  );
}

