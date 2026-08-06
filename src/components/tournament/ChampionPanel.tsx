import type {
  TournamentBracket,
} from "@/lib/bracket";

import type {
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ChampionPanelProps = {
  bracket: ActiveBracket;
};

export default function ChampionPanel({
  bracket,
}: ChampionPanelProps) {
  const champion = bracket.champion;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-red-500/35 bg-[radial-gradient(circle_at_50%_0%,rgba(127,29,29,0.28),transparent_58%),linear-gradient(180deg,#10090b,#090b0f_72%)] shadow-[0_20px_55px_rgba(0,0,0,0.4)]">
      <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-red-400/90 to-transparent" />
      <div className="pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full bg-red-600/10 blur-2xl" />
      <div className="pointer-events-none absolute -right-8 top-8 h-24 w-24 rounded-full bg-red-600/10 blur-2xl" />

      <div className="relative px-5 py-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center text-red-500 drop-shadow-[0_0_18px_rgba(239,68,68,0.45)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 64 64"
            fill="none"
            className="h-14 w-14"
          >
            <path
              d="M20 9h24v12c0 9.2-5.4 16.7-12 16.7S20 30.2 20 21V9Z"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <path
              d="M20 14H10v5c0 8.4 5.3 13.3 13.4 13.9M44 14h10v5c0 8.4-5.3 13.3-13.4 13.9M32 38v10M23 55h18M27 48h10v7H27v-7Z"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.24em] text-gray-200">
          Campeón del torneo
        </p>

        <p
          className={`mt-2 break-words text-xl font-black ${
            champion
              ? "text-red-300"
              : "text-red-400"
          }`}
        >
          {champion?.name ||
            "Por definir"}
        </p>

        <div className="mx-auto mt-4 h-px w-20 bg-gradient-to-r from-transparent via-red-500/55 to-transparent" />
      </div>
    </article>
  );
}