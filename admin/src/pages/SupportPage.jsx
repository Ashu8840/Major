import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import Loader from "../components/loading/Loader.jsx";
import { apiClient } from "../lib/apiClient.js";
import { useAdminSession } from "../context/AdminAuthContext.jsx";

const statusColors = {
  open: "bg-rose-100 text-rose-600",
  in_progress: "bg-amber-100 text-amber-600",
  resolved: "bg-emerald-100 text-emerald-600",
  closed: "bg-slate-100 text-slate-500",
};

const SupportPage = () => {
  const [statusFilter, setStatusFilter] = useState("open");
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAdminSession();

  const { data, isLoading } = useQuery({
    queryKey: ["support", statusFilter],
    queryFn: () =>
      apiClient.get(`/support/admin/tickets?status=${statusFilter}`),
    enabled: isAuthenticated,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) =>
      apiClient.patch(`/support/admin/tickets/${id}`, updates),
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      queryClient.invalidateQueries({ queryKey: ["support"] });
    },
    onError: (error) => {
      toast.error(error.payload?.message || "Update failed");
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stay on top of user escalations and resolution SLAs.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </header>

      {isLoading ? (
        <Loader label="Loading support tickets" />
      ) : (
        <div className="space-y-4">
          {(data?.tickets || []).map((ticket) => (
            <article
              key={ticket.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {ticket.subject}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {ticket.category} •{" "}
                    {formatDistanceToNow(new Date(ticket.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold uppercase ${
                    statusColors[ticket.status] || statusColors.open
                  }`}
                >
                  {ticket.status.replace("_", " ")}
                </span>
              </header>

              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {ticket.message}
              </p>

              <footer className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>Priority: {ticket.priority}</span>
                <span>
                  Updated{" "}
                  {formatDistanceToNow(new Date(ticket.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              </footer>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateMutation.mutate({
                      id: ticket.id,
                      updates: { status: "in_progress" },
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-primary-500 hover:text-primary-500"
                >
                  Mark in progress
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateMutation.mutate({
                      id: ticket.id,
                      updates: { status: "resolved" },
                    })
                  }
                  className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-600"
                >
                  Resolve
                </button>
              </div>
            </article>
          ))}
          {!data?.tickets?.length && (
            <p className="py-6 text-center text-sm text-slate-400">
              No tickets found for this status.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportPage;
