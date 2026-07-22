import { Tournament, TournamentBracket } from "../../../lib/bracket";
import InformationRow from "./InformationRow";

type InformationPanelProps = {
  tournament: Tournament;
  bracket: TournamentBracket;
};

export default function InformationPanel({
  tournament,
  bracket,
}: InformationPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1219] p-4">
      <h3 className="text-xs font-black">
        INFORMACIÓN
      </h3>

      <div className="mt-4 space-y-3 text-xs">
        <InformationRow
          label="Juego"
          value={tournament.game}
        />

        <InformationRow
          label="Equipos"
          value={`${tournament.teamCount}`}
        />

        <InformationRow
          label="Rondas"
          value={`${bracket.rounds.length}`}
        />

        <InformationRow
          label="Formato"
          value="Eliminación simple"
        />
      </div>
    </div>
  );
}