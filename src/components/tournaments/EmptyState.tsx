import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-20 text-center">

      <h2 className="text-3xl font-bold text-white">
        No tienes torneos
      </h2>

      <p className="text-gray-500 mt-4">
        Crea tu primer torneo para comenzar.
      </p>

      <Link
        href="/create"
        className="inline-block mt-8 bg-red-600 hover:bg-red-700 px-6 py-4 rounded-xl font-bold"
      >
        Crear torneo
      </Link>

    </div>
  );
}