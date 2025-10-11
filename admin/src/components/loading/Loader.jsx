const Loader = ({ label = "Loading..." }) => (
  <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-slate-500">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-500" />
    <p className="text-sm font-medium">{label}</p>
  </div>
);

export default Loader;
