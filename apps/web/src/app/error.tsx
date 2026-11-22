"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-ink-soft">
        {error.message.includes("fetch")
          ? "A API não respondeu. Confira se ela está rodando em http://localhost:3001."
          : error.message}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-full bg-rose-pastel px-5 py-2 font-semibold hover:brightness-95"
      >
        Tentar de novo
      </button>
    </div>
  );
}
