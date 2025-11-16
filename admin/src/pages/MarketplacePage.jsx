import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Loader from "../components/loading/Loader.jsx";
import { apiClient } from "../lib/apiClient.js";
import { useAdminSession } from "../context/AdminAuthContext.jsx";

const filters = [
  { label: "All listings", value: "all" },
  { label: "Free books", value: "free" },
  { label: "Paid books", value: "paid" },
];

const MarketplacePage = () => {
  const { isAuthenticated } = useAdminSession();
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", "books"],
    queryFn: () => apiClient.get("/marketplace/books"),
    enabled: isAuthenticated,
    retry: false,
  });

  const books = Array.isArray(data?.books) ? data.books : [];

  const filteredBooks = useMemo(() => {
    if (filter === "all") {
      return books;
    }

    if (filter === "free") {
      return books.filter((book) => Number(book?.price || 0) <= 0);
    }

    return books.filter((book) => Number(book?.price || 0) > 0);
  }, [books, filter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Marketplace Oversight
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track published titles, revenue, and moderation flags.
          </p>
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {filters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </header>

      {isLoading ? (
        <Loader label="Loading marketplace data" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-left">Seller</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Revenue</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Updated</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredBooks.map((book) => (
                <tr key={book._id || book.id}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={book.coverImage?.url || "/cover-fallback.png"}
                        alt={book.title}
                        className="h-14 w-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">
                          {book.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {book.genre || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    {book.seller?.name ||
                      book.seller?.displayName ||
                      book.author?.displayName ||
                      book.author?.username ||
                      (typeof book.author === "string" ? book.author : null) ||
                      (typeof book.seller === "string" ? book.seller : null) ||
                      "Unknown"}
                  </td>
                  <td className="px-6 py-3 font-semibold text-slate-700">
                    {book.priceFormatted || `₹${book.price ?? 0}`}
                  </td>
                  <td className="px-6 py-3 font-semibold text-emerald-600">
                    {book.revenueFormatted || "₹0"}
                  </td>
                  <td className="px-6 py-3 text-xs font-semibold uppercase text-slate-500">
                    {book.status ||
                      (Number(book?.price || 0) <= 0 ? "free" : "published")}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    {book.updatedAt
                      ? format(new Date(book.updatedAt), "dd MMM yyyy")
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <button className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-500 hover:text-primary-500">
                      Moderate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredBooks.length && (
            <p className="py-6 text-center text-sm text-slate-400">
              No books match the current filter.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
