"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@escronet/shared-ui/web";
import { api } from "@/lib/api";

export default function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ping"],
    queryFn: () => api.ping({ version: null }),
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Escronet</h1>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 px-8 py-4 text-sm">
        <span className="font-medium text-neutral-500">Backend REST</span>
        {isLoading && <span className="text-neutral-400">pinging…</span>}
        {isError && <span className="text-red-500">backend offline</span>}
        {data && (
          <span className="font-mono text-green-600">
            {data.message} &mdash;{" "}
            {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          action="negative"
          onClick={() => alert("shared-ui/web + Tailwind v4 ✓")}
        >
          Test negative
        </Button>
        <Button
          variant="outline"
          action="negative"
          onClick={() => alert("Outline variant ✓")}
        >
          Test outline
        </Button>
      </div>
    </main>
  );
}
