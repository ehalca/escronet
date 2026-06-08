"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline";
}

export function Button({ children, onClick, variant = "solid" }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-5 h-10 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40";

  const variants = {
    solid: "bg-zinc-900 text-white hover:bg-zinc-700 focus-visible:ring-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
    outline: "border border-zinc-300 text-zinc-900 hover:bg-zinc-100 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800",
  };

  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick}>
      {children}
    </button>
  );
}
