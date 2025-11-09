"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";
import {
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"requests" | "allowlist">("requests");
  const [newEmail, setNewEmail] = useState("");
  const [showAddEmail, setShowAddEmail] = useState(false);

  // Stats query
  const { data: stats, refetch: refetchStats } = api.admin.getStats.useQuery();

  // Access requests query
  const {
    data: accessRequests,
    isLoading: loadingRequests,
    refetch: refetchRequests,
  } = api.admin.getAccessRequests.useQuery();

  // Allowlist query
  const {
    data: allowlist,
    isLoading: loadingAllowlist,
    refetch: refetchAllowlist,
  } = api.admin.getAllowlist.useQuery();

  // Mutations
  const approveRequest = api.admin.approveAccessRequest.useMutation({
    onSuccess: () => {
      toast.success("Access request approved");
      refetchRequests();
      refetchAllowlist();
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve request");
    },
  });

  const rejectRequest = api.admin.rejectAccessRequest.useMutation({
    onSuccess: () => {
      toast.success("Access request rejected");
      refetchRequests();
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject request");
    },
  });

  const addToAllowlist = api.admin.addToAllowlist.useMutation({
    onSuccess: () => {
      toast.success("Email added to allowlist");
      setNewEmail("");
      setShowAddEmail(false);
      refetchAllowlist();
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add email");
    },
  });

  const removeFromAllowlist = api.admin.removeFromAllowlist.useMutation({
    onSuccess: () => {
      toast.success("Email removed from allowlist");
      refetchAllowlist();
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove email");
    },
  });

  const pendingRequests =
    accessRequests?.filter(
      (r: { id: string; email: string; status: string; requestedAt: Date }) =>
        r.status === "pending"
    ) || [];
  const approvedRequests =
    accessRequests?.filter(
      (r: { id: string; email: string; status: string; requestedAt: Date }) =>
        r.status === "approved"
    ) || [];
  const rejectedRequests =
    accessRequests?.filter(
      (r: { id: string; email: string; status: string; requestedAt: Date }) =>
        r.status === "rejected"
    ) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
          <Shield className="h-8 w-8 text-brandBlue-500" />
          Admin Dashboard
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Manage access requests and allowlist
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-xl bg-white dark:bg-neutral-800 p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Pending</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.pendingRequests || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-neutral-800 p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Approved</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.approvedRequests || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-neutral-800 p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Rejected</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.rejectedRequests || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-neutral-800 p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Requests</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.totalRequests || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-neutral-800 p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Allowlist</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.allowlistCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("requests")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "requests"
                ? "border-brandBlue-500 text-brandBlue-600 dark:text-brandBlue-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300"
            }`}
          >
            Access Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("allowlist")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "allowlist"
                ? "border-brandBlue-500 text-brandBlue-600 dark:text-brandBlue-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300"
            }`}
          >
            Allowlist ({allowlist?.length || 0})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {loadingRequests ? (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              Loading requests...
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              No pending requests
            </div>
          ) : (
            <div className="rounded-xl bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {pendingRequests.map(
                  (request: {
                    id: string;
                    email: string;
                    status: string;
                    requestedAt: Date;
                  }) => (
                  <div
                    key={request.id}
                    className="p-6 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {request.email}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                          Requested {format(new Date(request.requestedAt), "PPp")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveRequest.mutate({ id: request.id })}
                          disabled={approveRequest.isPending}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRequest.mutate({ id: request.id })}
                          disabled={rejectRequest.isPending}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "allowlist" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Allowed Emails
            </h2>
            <button
              onClick={() => setShowAddEmail(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brandBlue-500 text-white hover:bg-brandBlue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Email
            </button>
          </div>

          {showAddEmail && (
            <div className="rounded-xl bg-white dark:bg-neutral-800 p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 shadow-sm dark:bg-neutral-700 focus:border-brandBlue-500 dark:focus:border-brandBlue-400 focus:ring-brandBlue-500 dark:focus:ring-brandBlue-400"
                />
                <button
                  onClick={() => {
                    if (newEmail) {
                      addToAllowlist.mutate({ email: newEmail });
                    }
                  }}
                  disabled={!newEmail || addToAllowlist.isPending}
                  className="px-4 py-2 rounded-lg bg-brandBlue-500 text-white hover:bg-brandBlue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddEmail(false);
                    setNewEmail("");
                  }}
                  className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loadingAllowlist ? (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              Loading allowlist...
            </div>
          ) : allowlist && allowlist.length > 0 ? (
            <div className="rounded-xl bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {allowlist.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-6 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {entry.email}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Added {format(new Date(entry.createdAt), "PPp")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromAllowlist.mutate({ id: entry.id })}
                      disabled={removeFromAllowlist.isPending}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              No emails on allowlist
            </div>
          )}
        </div>
      )}
    </div>
  );
}

