import Link from "next/link";

export default function EmptyTournament() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#02070d] px-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0f15] p-10 text-center">
        <div className="text-6xl">
          🏆
        </div>

        <h1 className="mt-5 text-3xl font-black">
          No hay un torneo creado
        </h1>

        <p className="mt-3 text-gray-400">
          Crea un torneo para generar el
          fixture.
        </p>

        <Link
          href="/create"
          className="mt-7 inline-flex rounded-lg bg-red-600 px-6 py-3 font-black"
        >
          Crear torneo
        </Link>
      </div>
    </main>
  );
}