import { Tournament, TournamentBracket } from "../../../lib/bracket";

type TournamentHeroProps = {
  tournament: Tournament;
  bracket: TournamentBracket;
};

export default function TournamentHero({
  tournament,
  bracket,
}: TournamentHeroProps) {
  return (
    <section className="border-b border-white/10 bg-[#060b11]">
      <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6">
        <p className="text-[10px] font-black text-green-400">
          ●{" "}
          {bracket.champion
            ? "TORNEO FINALIZADO"
            : "TORNEO EN CURSO"}
        </p>

<h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
  {tournament.name}
</h1>

<p className="mt-4 text-xs font-bold tracking-wide text-gray-500">
  {tournament.game} · {tournament.teamCount} EQUIPOS ·{" "}
  {bracket.rounds.reduce(
    (total, round) => total + round.matches.length,
    0
  )}{" "}
  PARTIDOS ·{" "}
  {bracket.rounds.reduce(
    (total, round) =>
      total + round.matches.filter((match) => match.completed).length,
    0
  )}{" "}
  FINALIZADOS
</p>
      </div>
    </section>
  );
}