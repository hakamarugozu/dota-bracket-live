import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-white/10 bg-[#020913]">
      <div className="mx-auto flex min-h-[72px] max-w-[1800px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-black text-white sm:text-xl">
          Esports Bracket{" "}
          <span className="text-red-500">
            Live
          </span>
        </h1>

        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden text-sm text-gray-500 lg:block">
            Plataforma Profesional de Torneos Multijuego
          </span>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-gray-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white sm:px-4 sm:text-xs"
          >
            <span className="hidden sm:inline">
              ← VOLVER AL DASHBOARD
            </span>

            <span className="sm:hidden">
              ← DASHBOARD
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}