export default function Header() {
  return (
    <header className="border-b border-white/10 bg-[#020913]">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-4">
        <h1 className="text-xl font-black text-white">
          Dota Bracket Live
        </h1>

        <span className="text-sm text-gray-500">
          Plataforma Profesional de Torneos
        </span>
      </div>
    </header>
  );
}