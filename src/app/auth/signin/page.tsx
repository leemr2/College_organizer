"use client";

import React, { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";

const isDev = process.env.NODE_ENV !== "production";

function SignInContent() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [useCredentials, setUseCredentials] = React.useState(isDev);
  const [showRequestAccess, setShowRequestAccess] = React.useState(false);
  const [requestEmail, setRequestEmail] = React.useState("");
  const [isRequesting, setIsRequesting] = React.useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const requestAccessMutation = api.admin.requestAccess.useMutation({
    onSuccess: () => {
      toast.success("Access request submitted! We'll review it and get back to you soon.");
      setShowRequestAccess(false);
      setRequestEmail("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit access request");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (useCredentials) {
        const result = await signIn("credentials", {
          email,
          password,
          callbackUrl,
          redirect: false,
        });
        if (result?.error) {
          alert("Invalid email or password");
          setIsLoading(false);
        } else if (result?.ok) {
          router.push(callbackUrl);
          router.refresh();
        }
      } else {
        await signIn("email", { email, callbackUrl });
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 px-4">
      <Link
        href="/"
        className="group absolute left-4 top-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back
      </Link>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brandBlue-500 to-brandBlue-700 dark:from-brandBlue-400 dark:to-brandBlue-600">
              Welcome
            </span>
          </h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-300">
            {useCredentials
              ? "Sign in with email and password (Dev Mode)"
              : "Enter your email to sign in or create an account"}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-neutral-800/50 p-8 shadow-xl">
          {isDev && (
            <div className="mb-6 flex gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-700/50 p-1">
              <button
                type="button"
                onClick={() => setUseCredentials(true)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  useCredentials
                    ? "bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <Lock className="mr-2 inline h-4 w-4" />
                Password (Dev)
              </button>
              <button
                type="button"
                onClick={() => setUseCredentials(false)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  !useCredentials
                    ? "bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <Mail className="mr-2 inline h-4 w-4" />
                Email Link
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 shadow-sm dark:bg-neutral-800 focus:border-brandBlue-500 dark:focus:border-brandBlue-400 focus:ring-brandBlue-500 dark:focus:ring-brandBlue-400"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {useCredentials && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Password
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 shadow-sm dark:bg-neutral-800 focus:border-brandBlue-500 dark:focus:border-brandBlue-400 focus:ring-brandBlue-500 dark:focus:ring-brandBlue-400"
                    placeholder="Enter your password"
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  💡 Dev mode: First-time login will create your account automatically
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brandBlue-500 to-brandBlue-600 px-4 py-3 text-white shadow-lg shadow-brandBlue-500/20 transition-all hover:from-brandBlue-600 hover:to-brandBlue-700 hover:shadow-xl hover:shadow-brandBlue-500/30 focus:outline-none focus:ring-2 focus:ring-brandBlue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {useCredentials ? (
                <>
                  <Lock className="h-5 w-5" />
                  {isLoading ? "Signing in..." : "Sign in"}
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  {isLoading ? "Sending link..." : "Sign in with Email"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
              By signing in, you agree to our{" "}
              <Link
                href="https://example.com/legal"
                className="font-medium text-brandBlue-600 dark:text-brandBlue-400 hover:text-brandBlue-500"
              >
                Privacy Policy
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setShowRequestAccess(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Request Access
            </button>
            <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
              Don't have access yet? Request an invitation.
            </p>
          </div>
        </div>
      </div>

      {/* Request Access Modal */}
      {showRequestAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-neutral-800 shadow-xl p-6">
            <button
              onClick={() => {
                setShowRequestAccess(false);
                setRequestEmail("");
              }}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Request Access
              </h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Enter your email address and we'll review your request. You'll receive an email once
                your access is approved.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!requestEmail) return;

                setIsRequesting(true);
                try {
                  await requestAccessMutation.mutateAsync({ email: requestEmail });
                } finally {
                  setIsRequesting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="request-email"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="request-email"
                    type="email"
                    required
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    className="block w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 shadow-sm dark:bg-neutral-700 focus:border-brandBlue-500 dark:focus:border-brandBlue-400 focus:ring-brandBlue-500 dark:focus:ring-brandBlue-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestAccess(false);
                    setRequestEmail("");
                  }}
                  className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRequesting || !requestEmail}
                  className="flex-1 rounded-lg bg-gradient-to-r from-brandBlue-500 to-brandBlue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brandBlue-500/20 transition-all hover:from-brandBlue-600 hover:to-brandBlue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRequesting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
