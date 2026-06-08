"use client";

import { Button } from "@/components/Button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white dark:bg-zinc-950">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Escronet
      </h1>
      <div className="flex gap-3">
        <Button onClick={() => alert("Tailwind + gluestack ✓")}>
          Test solid
        </Button>
        <Button variant="outline" onClick={() => alert("Outline variant ✓")}>
          Test outline
        </Button>
      </div>
    </main>
  );
}
