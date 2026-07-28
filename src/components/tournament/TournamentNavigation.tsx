"use client";

type TournamentNavigationProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

const tabs = [
  {
    id: "BRACKET",
    icon: "🏆",
    label: "BRACKET",
  },
  {
    id: "PARTIDOS",
    icon: "📅",
    label: "PARTIDOS",
  },
  {
    id: "EQUIPOS",
    icon: "👥",
    label: "EQUIPOS",
  },
  {
    id: "REGLAS",
    icon: "📜",
    label: "REGLAS",
  },
  {
    id: "CLASIFICACION",
    icon: "📊",
    label: "CLASIFICACIÓN",
  },
  {
    id: "STREAM",
    icon: "📺",
    label: "STREAM",
  },
] as const;

export default function TournamentNavigation({
  activeTab,
  onTabChange,
}: TournamentNavigationProps) {
  return (
    <div className="mx-auto max-w-[1800px] px-4 pt-4 sm:px-6">
      <div className="flex overflow-x-auto rounded-xl border border-white/10 bg-black/40 shadow-lg">
        {tabs.map((tab) => {
          const selected =
            activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onTabChange(tab.id);
              }}
              className={`relative flex min-w-[150px] items-center justify-center border-r border-white/10 px-5 py-4 text-[11px] font-black tracking-wide transition last:border-r-0 ${
                selected
                  ? "bg-gradient-to-r from-red-950/90 to-red-900/50 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="mr-2">
                {tab.icon}
              </span>

              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}