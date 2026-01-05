"use client";

import React, { Suspense, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";

function SignInContent() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showRequestAccess, setShowRequestAccess] = React.useState(false);
  const [requestEmail, setRequestEmail] = React.useState("");
  const [isRequesting, setIsRequesting] = React.useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Debounced email check for user status
  const [debouncedEmail, setDebouncedEmail] = React.useState<string>("");
  // Validate email format more strictly
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = debouncedEmail.length > 0 && emailRegex.test(debouncedEmail);
  
  // Only call query when we have a valid email - use skip token to avoid validation errors
  const { data: userStatus, isLoading: isCheckingStatus } = api.auth.checkUserStatus.useQuery(
    { email: isValidEmail ? debouncedEmail : "skip@validation.com" },
    { 
      enabled: isValidEmail,
      retry: false,
    }
  );

  // Debounce email input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(email);
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  // Determine if we should show password field
  const shouldShowPassword = userStatus?.exists && userStatus?.hasPassword;
  const shouldShowEmailLink = !userStatus?.exists || !userStatus?.hasPassword;

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
      if (shouldShowPassword && password) {
        // Use credentials provider for password auth
        const result = await signIn("credentials", {
          email,
          password,
          callbackUrl,
          redirect: false,
        });
        if (result?.error) {
          toast.error("Invalid email or password");
          setIsLoading(false);
        } else if (result?.ok) {
          router.push(callbackUrl);
          router.refresh();
        }
      } else if (shouldShowEmailLink) {
        // Use email provider for email link auth
        try {
          const result = await signIn("email", { 
            email, 
            callbackUrl,
            redirect: false,
          });
          
          if (result?.error) {
            // Email provider not configured or other error
            if (result.error === "Configuration" || result.error.includes("provider") || result.error.includes("Email")) {
              toast.error("Email sign-in is not configured. Please check that EMAIL_SERVER_PASSWORD is set in Vercel environment variables.");
            } else {
              toast.error(result.error || "Failed to send sign-in email. Please try again.");
            }
            setIsLoading(false);
          } else {
            // Success - NextAuth will redirect to verify page, but we can also redirect manually
            router.push("/auth/verify");
          }
        } catch (error) {
          // If signIn throws (e.g., provider doesn't exist), catch it here
          console.error("Email sign-in error:", error);
          toast.error("Email sign-in failed. The email provider may not be configured. Please contact support.");
          setIsLoading(false);
        }
      } else {
        // Should not happen, but handle edge case
        toast.error("Please enter your password or use email link sign-in");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("An unexpected error occurred. Please try again.");
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
            {shouldShowPassword
              ? "Sign in with your password"
              : "Enter your email to sign in or create an account"}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-neutral-800/50 p-8 shadow-xl">

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

            {shouldShowPassword && (
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
              </div>
            )}

            {shouldShowEmailLink && userStatus?.exists && !userStatus?.hasPassword && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Set a password in your{" "}
                  <Link href="/profile" className="font-medium underline">
                    profile settings
                  </Link>{" "}
                  for faster sign-in next time.
                </p>
              </div>
            )}

            {isCheckingStatus && debouncedEmail && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                Checking...
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (shouldShowPassword && !password) || isCheckingStatus}
              className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brandBlue-500 to-brandBlue-600 px-4 py-3 text-white shadow-lg shadow-brandBlue-500/20 transition-all hover:from-brandBlue-600 hover:to-brandBlue-700 hover:shadow-xl hover:shadow-brandBlue-500/30 focus:outline-none focus:ring-2 focus:ring-brandBlue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {shouldShowPassword ? (
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
