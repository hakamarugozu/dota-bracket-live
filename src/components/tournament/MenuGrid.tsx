import Link from "next/link";
import { useParams } from "next/navigation";

export default function MenuGrid() {
  const { id } = useParams();

  const items = [
    {
      icon: "👥",
      title: "Equipos",
      href: `/tournaments/${id}/teams`,
    },
    {
      icon: "🏁",
      title: "Fixture",
      href: `/tournaments/${id}/bracket`,
    },
    {
      icon: "⚔",
      title: "Partidos",
      href: `/tournaments/${id}/matches`,
    },
    {
      icon: "📺",
      title: "Stream",
      href: `/tournaments/${id}/stream`,
    },
    {
      icon: "📜",
      title: "Reglas",
      href: `/tournaments/${id}/rules`,
    },
    {
      icon: "👨‍💼",
      title: "Staff",
      href: `/tournaments/${id}/staff`,
    },
    {
      icon: "⚙",
      title: "Ajustes",
      href: `/tournaments/${id}/settings`,
    },
    {
      icon: "🔗",
      title: "Compartir",
      href: "#",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className="group rounded-lg border border-[#2A2A2A] bg-[#141414] hover:border-red-600 transition-all duration-200 p-4"
        >
          <div className="text-2xl">{item.icon}</div>

          <div className="mt-2 text-sm font-semibold text-white">
            {item.title}
          </div>
        </Link>
      ))}
    </div>
  );
}