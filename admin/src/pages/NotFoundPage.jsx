const NotFoundPage = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
    <h1 className="text-4xl font-semibold text-slate-900">404</h1>
    <p className="max-w-md text-sm text-slate-500">
      The page you are looking for might have been removed or is temporarily
      unavailable.
    </p>
    <a
      href="/dashboard"
      className="rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-600"
    >
      Back to dashboard
    </a>
  </div>
);

export default NotFoundPage;
