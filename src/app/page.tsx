import Header from "@/components/Header";
import Link from "next/link";

export default function Home() {
return (
  <>
    <Header />

    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold text-red-500">
        Dota Bracket Live
      </h1>

      <p className="mt-4 text-xl text-gray-300">
        Plataforma de torneos Dota 1
      </p>

      <div className="mt-10 w-full max-w-2xl border border-red-500 rounded-xl p-6 bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            Próximos torneos
          </h2>

          <Link href="/create">
            <button className="bg-red-600 hover:bg-red-700 transition px-4 py-2 rounded-lg font-semibold">
              Crear torneo
            </button>
          </Link>
        </div>

        <p className="mt-6 text-gray-400">
          Aún no hay torneos creados.
        </p>
      </div>
    </main>
  </>
  );
}