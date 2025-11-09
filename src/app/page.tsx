import { redirect } from "next/navigation";
import ClientProvider from "@/components/ClientProvider";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    select: { onboardingComplete: true },
  });

  // If no student record or onboarding not complete, redirect to onboarding
  if (!student || !student.onboardingComplete) {
    redirect("/onboarding");
  }

  // User has completed onboarding - redirect to dashboard
  redirect("/dashboard");
}
