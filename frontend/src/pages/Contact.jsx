import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  IoMailOutline,
  IoCallOutline,
  IoChatbubblesOutline,
  IoTimeOutline,
  IoSend,
  IoShieldCheckmarkOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline,
  IoDocumentTextOutline,
} from "react-icons/io5";
import { createSupportTicket, getUserSupportTickets } from "../utils/api";

const categories = [
  { value: "general", label: "General question" },
  { value: "technical", label: "Technical issue" },
  { value: "billing", label: "Billing & plans" },
  { value: "feedback", label: "Product feedback" },
  { value: "other", label: "Something else" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

const statusStyles = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-200 text-gray-600",
};

const initialFormState = {
  subject: "",
  category: "general",
  priority: "normal",
  message: "",
};

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    return value;
  }
};

export default function Contact() {
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");

    try {
      const data = await getUserSupportTickets();
      setTickets(data?.tickets || []);
    } catch (error) {
      console.error("Failed to load support history", error);
      const message =
        error?.response?.data?.message ||
        "Unable to load your previous requests.";
      setHistoryError(message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const subject = form.subject.trim();
    const message = form.message.trim();

    if (!subject) {
      toast.error("Please add a short subject for your request.");
      return;
    }

    if (!message) {
      toast.error("Let us know how we can help you by adding a message.");
      return;
    }

    setSubmitting(true);
    try {
      const { ticket } = await createSupportTicket({
        subject,
        message,
        category: form.category,
        priority: form.priority,
      });

      toast.success("Thanks! Our team will get back to you soon.");
      setTickets((previous) => [ticket, ...(previous || [])]);
      setForm((prev) => ({ ...initialFormState, category: prev.category }));
    } catch (error) {
      console.error("Failed to submit support ticket", error);
      const message =
        error?.response?.data?.message ||
        "We couldn't send your message. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasHistory = useMemo(() => tickets && tickets.length > 0, [tickets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 space-y-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10 flex flex-col gap-8 p-8 sm:p-12 md:flex-row md:items-center">
            <div className="space-y-4 md:w-2/3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
                <IoShieldCheckmarkOutline className="h-4 w-4" />
                <span>Dedicated Support</span>
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
                We're here to help you keep writing
              </h1>
              <p className="text-base text-blue-100 sm:text-lg">
                Reach out with questions, report issues, or share feedback. Our
                team typically responds within 24 hours on weekdays.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <span className="text-sm text-blue-100">Support Hours</span>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <IoTimeOutline className="h-4 w-4" />
                    <span>Mon – Fri · 9:00 – 19:00 IST</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <span className="text-sm text-blue-100">Response time</span>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <IoCheckmarkCircleOutline className="h-4 w-4" />
                    <span>Under 24 hours</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4 rounded-2xl bg-white/10 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <IoMailOutline className="h-6 w-6" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-100">
                    Email
                  </p>
                  <a
                    href="mailto:support@major-app.com"
                    className="text-base font-semibold text-white underline-offset-2 hover:underline"
                  >
                    support@major-app.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <IoChatbubblesOutline className="h-6 w-6" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-100">
                    Community
                  </p>
                  <p className="text-base font-semibold">
                    Join #help-desk inside Community
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <IoCallOutline className="h-6 w-6" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-100">
                    Phone (priority)
                  </p>
                  <p className="text-base font-semibold">+91-80471-12345</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-blue-900">
                Send us a message
              </h2>
              <p className="text-sm text-blue-600">
                Fill in the form and our support specialists will follow up by
                email.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="subject"
                  className="text-sm font-medium text-blue-800"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Brief summary of your request"
                  className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="category"
                  className="text-sm font-medium text-blue-800"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {categories.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="priority"
                  className="text-sm font-medium text-blue-800"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {priorities.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="message"
                className="text-sm font-medium text-blue-800"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                required
                value={form.message}
                onChange={handleChange}
                placeholder="Describe the issue, steps to reproduce, or share your feedback."
                className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-blue-500">
                <IoWarningOutline className="h-4 w-4" />
                Please avoid sharing sensitive personal information.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                <IoSend className="h-4 w-4" />
                <span>{submitting ? "Sending..." : "Submit request"}</span>
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur">
              <h3 className="text-lg font-semibold text-blue-900">
                Why creators love our support
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-700">
                <li className="flex items-start gap-3">
                  <IoCheckmarkCircleOutline className="mt-1 h-4 w-4 text-emerald-500" />
                  <span>Real humans who understand writers and creators</span>
                </li>
                <li className="flex items-start gap-3">
                  <IoCheckmarkCircleOutline className="mt-1 h-4 w-4 text-emerald-500" />
                  <span>Detailed follow-ups with actionable next steps</span>
                </li>
                <li className="flex items-start gap-3">
                  <IoCheckmarkCircleOutline className="mt-1 h-4 w-4 text-emerald-500" />
                  <span>
                    Priority escalation for outages or billing concerns
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold">Need faster help?</h3>
              <p className="mt-2 text-sm text-indigo-100">
                Check the Knowledge Base for quick tutorials, tips, and best
                practices.
              </p>
              <a
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
                href="https://support.major-app.com"
                target="_blank"
                rel="noreferrer"
              >
                <IoDocumentTextOutline className="h-4 w-4" />
                Open knowledge base
              </a>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-blue-900">
                Your recent requests
              </h2>
              <p className="text-sm text-blue-600">
                Track the status of every message you've sent our way.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 text-sm text-blue-600">
                Loading your support history…
              </div>
            ) : historyError ? (
              <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                <IoWarningOutline className="h-4 w-4 flex-shrink-0" />
                <span>{historyError}</span>
              </div>
            ) : hasHistory ? (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-2xl border border-blue-100 bg-white/70 p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-blue-900">
                          {ticket.subject}
                        </h3>
                        <p className="text-xs text-blue-500">
                          {formatDateTime(ticket.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                        <span
                          className={`rounded-full px-3 py-1 capitalize ${
                            statusStyles[ticket.status] || statusStyles.open
                          }`}
                        >
                          {ticket.status.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                          {ticket.category}
                        </span>
                        <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                          Priority: {ticket.priority}
                        </span>
                      </div>
                    </div>
                    {ticket.message && (
                      <p className="mt-3 line-clamp-3 text-sm text-blue-700">
                        {ticket.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-blue-200 py-12 text-center text-sm text-blue-600">
                No support requests yet. Reach out using the form above and
                we'll be in touch soon.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur md:grid-cols-2">
          <div>
            <h3 className="text-xl font-semibold text-blue-900">
              Frequently asked
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-blue-700">
              <li>
                <strong className="font-semibold text-blue-800">
                  How quickly can I expect a reply?
                </strong>
                <p className="mt-1 text-blue-600">
                  Most tickets receive a response within a business day. High
                  priority issues are escalated instantly.
                </p>
              </li>
              <li>
                <strong className="font-semibold text-blue-800">
                  Where can I track updates?
                </strong>
                <p className="mt-1 text-blue-600">
                  We send replies to your account email and reflect the status
                  above. You'll also receive in-app notifications.
                </p>
              </li>
              <li>
                <strong className="font-semibold text-blue-800">
                  Do you support enterprise teams?
                </strong>
                <p className="mt-1 text-blue-600">
                  Yes! Reach out with the subject "Enterprise" and we'll share
                  tailored onboarding resources.
                </p>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100 p-6 text-sm text-blue-700">
            <h4 className="text-lg font-semibold text-blue-900">
              Need to attach files?
            </h4>
            <p className="mt-2">
              Reply to our confirmation email with screenshots, screen
              recordings, or exports. We're working on secure uploads right
              inside the app.
            </p>
            <p className="mt-4">
              For urgent outages, use the phone line above or message a
              moderator in the Community hub.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
