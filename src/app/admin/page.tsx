import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { NavigationBar } from "@/components/NavigationBar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  if (!session.user.isAdmin && session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <>
      <NavigationBar />
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <AdminDashboard />
        </div>
      </div>
    </>
  );
}

