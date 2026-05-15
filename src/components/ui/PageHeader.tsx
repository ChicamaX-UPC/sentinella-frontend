export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6 border-b border-white/10 pb-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h1>
      {description ? <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p> : null}
    </header>
  );
}
