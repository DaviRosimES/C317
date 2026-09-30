import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <p className="eyebrow text-ink-subtle">Observatório do Turismo</p>
      <p className="mt-2 text-sm text-ink-muted">Setup inicial concluído.</p>
    </main>
  ),
});
