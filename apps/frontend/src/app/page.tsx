"use client";

import { Button } from "@escronet/shared-ui/web";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Escronet</h1>
      <div className="flex gap-3">
        <Button action="negative" onClick={() => alert("shared-ui/web + Tailwind v4 ✓")}>
          Test negative
        </Button>
        <Button variant="outline" action="negative" onClick={() => alert("Outline variant ✓")}>
          Test outline
        </Button>
      </div>
    </main>
  );
}
