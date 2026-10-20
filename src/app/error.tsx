"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-svh place-items-center bg-ivory px-6 text-center">
      <div>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-4 text-5xl text-plum">We hit a snag.</h1>
        <p className="mt-4 text-ink/70">Please try again. If it keeps happening, email us and we will sort it out.</p>
        <button onClick={reset} className="btn btn-primary mt-8">Try again</button>
      </div>
    </main>
  );
}
