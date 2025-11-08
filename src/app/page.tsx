import React from "react";
import { redirect } from "next/navigation";
import ClientProvider from "@/components/ClientProvider";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NavigationBar } from "@/components/NavigationBar";
import Link from "next/link";
import { ArrowRight, MessageSquare, CheckSquare, LayoutDashboard, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerAuthSession();

  // If not authenticated, show marketing page
  if (!session?.user) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <main className="flex-1 flex flex-col w-full mx-auto">
          <ClientProvider>
            <div className="flex-1 flex items-start justify-center bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
              <section className="max-w-7xl w-full space-y-8 animate-fade-in px-4 py-12">
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                  <div className="space-y-4">
                    <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brandBlue-500 to-brandBlue-700 dark:from-brandBlue-400 dark:to-brandBlue-600">
                      Welcome to Scout
                    </h1>
                    <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl">
                      Your AI-powered daily assistant for college students. Capture tasks, get organized, and stay on top of your schedule.
                    </p>
                  </div>
                  <Link
                    href="/auth/signin"
                    className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-brandBlue-500 to-brandBlue-600 hover:from-brandBlue-600 hover:to-brandBlue-700 text-white rounded-lg px-8 py-4 text-lg font-medium shadow-lg shadow-brandBlue-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-brandBlue-500/30"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </section>
            </div>
          </ClientProvider>
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              © {new Date().getFullYear()} All Rights Reserved
            </span>
            <div className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
              <Link
                href="/privacy"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Check if student exists and onboarding status
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { onboardingComplete: true, name: true },
  });

  // If no student record or onboarding not complete, redirect to onboarding
  if (!student || !student.onboardingComplete) {
    redirect("/onboarding");
  }

  // User has completed onboarding - show welcome dashboard
  return (
    <div className="min-h-screen flex flex-col relative">
      <NavigationBar />
      <main className="flex-1 flex flex-col w-full mx-auto">
        <ClientProvider>
          <div className="flex-1 bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
              {/* Welcome Header */}
              <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brandBlue-500 to-brandBlue-700 dark:from-brandBlue-400 dark:to-brandBlue-600">
                  Welcome back, {student.name || session.user.name || "there"}!
                </h1>
                <p className="text-lg text-neutral-600 dark:text-neutral-300">
                  Ready to tackle your day? Let's get started.
                </p>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <Link
                  href="/chat"
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-800/50 p-8 shadow-lg hover:shadow-xl transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-brandBlue-300 dark:hover:border-brandBlue-600"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-brandBlue-500 to-brandBlue-600 group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                        Chat with Scout
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Start a conversation, add tasks, and get help with your day
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="absolute bottom-6 right-6 w-5 h-5 text-neutral-400 group-hover:text-brandBlue-500 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                  href="/tasks"
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-800/50 p-8 shadow-lg hover:shadow-xl transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-brandBlue-300 dark:hover:border-brandBlue-600"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-green-600 group-hover:scale-110 transition-transform">
                      <CheckSquare className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                        View Tasks
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        See all your tasks and track your progress
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="absolute bottom-6 right-6 w-5 h-5 text-neutral-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                  href="/dashboard"
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-800/50 p-8 shadow-lg hover:shadow-xl transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-brandBlue-300 dark:hover:border-brandBlue-600"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 group-hover:scale-110 transition-transform">
                      <LayoutDashboard className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                        Dashboard
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Overview of your schedule and daily insights
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="absolute bottom-6 right-6 w-5 h-5 text-neutral-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>

              {/* Quick Tip */}
              <div className="mt-12 rounded-xl bg-gradient-to-r from-brandBlue-50 to-brandBlue-100 dark:from-brandBlue-900/20 dark:to-brandBlue-800/20 p-6 border border-brandBlue-200 dark:border-brandBlue-700">
                <div className="flex items-start gap-4">
                  <Sparkles className="w-6 h-6 text-brandBlue-600 dark:text-brandBlue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-brandBlue-900 dark:text-brandBlue-100 mb-1">
                      Pro Tip
                    </h4>
                    <p className="text-sm text-brandBlue-700 dark:text-brandBlue-300">
                      Start by chatting with Scout to add your first task. Just describe what you need to do in natural language!
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </ClientProvider>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            © {new Date().getFullYear()} All Rights Reserved
          </span>
          <div className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
            <Link
              href="/privacy"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
