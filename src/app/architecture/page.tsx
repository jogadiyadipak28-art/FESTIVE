import { GENAI_MAP } from "@/lib/architecture";

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documentation</p>
      <h1 className="mt-3 font-heading text-4xl">GenAI architecture map</h1>
      <p className="mt-4 text-muted-foreground">
        Every Festiva surface traces to a single adapter in <code>lib/ai.ts</code>. Live calls request JSON, then Zod validates the payload before the UI renders it. Missing keys or schema failures fall back to labelled demo data — never a silent fake.
      </p>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-3">Surface</th>
              <th className="py-2 pr-3">Route</th>
              <th className="py-2 pr-3">Adapter</th>
              <th className="py-2">Fallback</th>
            </tr>
          </thead>
          <tbody>
            {GENAI_MAP.map((row) => (
              <tr key={row.route} className="border-b border-border align-top">
                <td className="py-3 pr-3 font-medium">{row.surface}</td>
                <td className="py-3 pr-3">{row.route}</td>
                <td className="py-3 pr-3">{row.adapter}</td>
                <td className="py-3">{row.fallback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
