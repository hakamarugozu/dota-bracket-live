import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full bg-neutral-950 border-b border-red-600">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/">
          <h1 className="text-2xl font-bold text-red-500 cursor-pointer">
            Dota Bracket Live
          </h1>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-white hover:text-red-500 transition"
          >
            Inicio
          </Link>

          <Link
            href="/create"
            className="bg-red-600 hover:bg-red-700 transition px-4 py-2 rounded-lg font-semibold"
          >
            Crear torneo
          </Link>
        </nav>
      </div>
    </header>
  );
}