// Middleware rewrites bare paths to /en/... before this route is ever matched.
// This file exists only as a Next.js route slot — it is never rendered.
export default function RootPage() {
  return null;
}
