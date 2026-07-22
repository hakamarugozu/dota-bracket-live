type TournamentNavigationProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export default function TournamentNavigation({
  activeTab,
  onTabChange,
}: TournamentNavigationProps) {
  const tabs = [
    "BRACKET",
    "PARTIDOS",
    "EQUIPOS",
    "REGLAS",
    "TABLA",
    "STREAM",
  ];

  const tabIcons: Record<string, string> = {
    BRACKET: "🏆",
    PARTIDOS: "📅",
    EQUIPOS: "👥",
    REGLAS: "📜",
    TABLA: "📊",
    STREAM: "📺",
  };

  return (
    <div className="mx-auto max-w-[1800px] px-4 pt-4 sm:px-6">
      <div className="flex overflow-x-auto rounded-xl border border-white/10 bg-black/40 shadow-lg">
        {tabs.map((tab) => {
          const selected = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`min-w-[150px] border-r border-white/10 px-5 py-4 text-[11px] font-black tracking-wide transition last:border-r-0 ${
                selected
                  ? "bg-gradient-to-r from-red-950/90 to-red-900/50 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tabIcons[tab]} {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}