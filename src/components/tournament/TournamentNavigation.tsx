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
    <div className="mx-auto w-full max-w-[1800px] px-4 pt-4 sm:px-6">
      <div className="flex overflow-x-auto rounded-xl border border-white/10 bg-[#05080d]/95 shadow-[0_16px_45px_rgba(0,0,0,0.3)]">
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
                  ? "bg-[linear-gradient(100deg,rgba(127,29,29,0.88),rgba(69,10,10,0.46)_70%,rgba(20,8,10,0.75))] text-white shadow-[inset_0_1px_0_rgba(248,113,113,0.14)]"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className={`mr-2 transition ${
                  selected
                    ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                    : "grayscale"
                }`}
              >
                {tab.icon}
              </span>

              {tab.label}

              {selected && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.85)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}