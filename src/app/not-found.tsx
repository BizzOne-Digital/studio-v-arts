import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-ivory px-6 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="display mt-4 text-7xl text-plum">Lost your vibe?</h1>
        <p className="mt-4 text-ink/70">We could not find that page.</p>
        <Link href="/" className="btn btn-primary mt-8">Back to home</Link>
      </div>
    </main>
  );
}
