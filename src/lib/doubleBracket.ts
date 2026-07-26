import type {
  Tournament,
  TournamentBracket,
  BracketRound,
  BracketMatch,
  BracketTeam,
} from "./bracket";

/**
 * Tipo de sección de la llave.
 */
export type BracketSection =
  | "winner"
  | "loser"
  | "grand-final"
  | "reset-final";

/**
 * Partido de doble eliminación.
 *
 * Extiende el partido normal para no romper
 * la compatibilidad con el resto del proyecto.
 */
export interface DoubleBracketMatch
  extends BracketMatch {

  section: BracketSection;

  loserNextMatchId: string | null;

  loserNextMatchPosition:
    | 1
    | 2
    | null;

  loserId: string | null;

  automaticAdvance: boolean;
}

/**
 * Ronda de doble eliminación.
 */
export interface DoubleBracketRound
  extends Omit<
    BracketRound,
    "matches"
  > {

  section: BracketSection;

  matches:
    DoubleBracketMatch[];
}

/**
 * Llave completa.
 */
export interface DoubleTournamentBracket
  extends Omit<
    TournamentBracket,
    "rounds"
  > {

  winnerRounds: DoubleBracketRound[];

  loserRounds: DoubleBracketRound[];

  grandFinal: DoubleBracketMatch | null;

  resetFinal: DoubleBracketMatch | null;
}
const MINIMUM_PARTICIPANTS = 2;

const SUPPORTED_CAPACITIES = [
  8,
  16,
  32,
  64,
] as const;

type MatchPosition = 1 | 2;

type LocatedDoubleMatch = {
  match: DoubleBracketMatch;
  round: DoubleBracketRound | null;
  section: BracketSection;
};

function getNextPowerOfTwo(
  participantCount: number
): number {
  let bracketSize = 2;

  while (bracketSize < participantCount) {
    bracketSize *= 2;
  }

  return bracketSize;
}

function createDoubleTeam(
  name: string,
  index: number
): BracketTeam {
  return {
    id: `team-${index + 1}`,
    name,
    seed: index + 1,
  };
}

function createWinnerMatchId(
  roundIndex: number,
  matchIndex: number
): string {
  return `double-winner-round-${roundIndex}-match-${matchIndex}`;
}

function createLoserMatchId(
  roundIndex: number,
  matchIndex: number
): string {
  return `double-loser-round-${roundIndex}-match-${matchIndex}`;
}

function createGrandFinalId(): string {
  return "double-grand-final";
}

function createResetFinalId(): string {
  return "double-reset-final";
}

function getWinnerRoundName(
  bracketSize: number,
  roundIndex: number
): string {
  const teamsRemaining =
    bracketSize / Math.pow(2, roundIndex);

  if (teamsRemaining === 64) {
    return "Winner Bracket - Ronda de 64";
  }

  if (teamsRemaining === 32) {
    return "Winner Bracket - Dieciseisavos";
  }

  if (teamsRemaining === 16) {
    return "Winner Bracket - Octavos";
  }

  if (teamsRemaining === 8) {
    return "Winner Bracket - Cuartos de final";
  }

  if (teamsRemaining === 4) {
    return "Winner Bracket - Semifinales";
  }

  if (teamsRemaining === 2) {
    return "Final del Winner Bracket";
  }

  return `Winner Bracket - Ronda ${roundIndex + 1}`;
}

function getLoserRoundName(
  roundIndex: number,
  totalLoserRounds: number
): string {
  if (roundIndex === totalLoserRounds - 1) {
    return "Final del Loser Bracket";
  }

  return `Loser Bracket - Ronda ${roundIndex + 1}`;
}

function createEmptyDoubleMatch(
  options: {
    id: string;
    roundIndex: number;
    matchIndex: number;
    roundName: string;
    section: BracketSection;

    team1?: BracketTeam | null;
    team2?: BracketTeam | null;

    nextMatchId?: string | null;
    nextMatchPosition?: MatchPosition | null;

    loserNextMatchId?: string | null;
    loserNextMatchPosition?: MatchPosition | null;
  }
): DoubleBracketMatch {
  return {
    id: options.id,
    roundIndex: options.roundIndex,
    matchIndex: options.matchIndex,
    roundName: options.roundName,

    section: options.section,

    team1: options.team1 ?? null,
    team2: options.team2 ?? null,

    score1: 0,
    score2: 0,

    winnerId: null,
    loserId: null,

    completed: false,
    automaticAdvance: false,

    nextMatchId:
      options.nextMatchId ?? null,

    nextMatchPosition:
      options.nextMatchPosition ?? null,

    loserNextMatchId:
      options.loserNextMatchId ?? null,

    loserNextMatchPosition:
      options.loserNextMatchPosition ?? null,
  };
}

function validateDoubleTournament(
  tournament: Tournament
): {
  cleanTeams: string[];
  participantCount: number;
  bracketSize: number;
} {
  if (
    !SUPPORTED_CAPACITIES.includes(
      tournament.teamCount as
        (typeof SUPPORTED_CAPACITIES)[number]
    )
  ) {
    throw new Error(
      "La capacidad máxima debe ser 8, 16, 32 o 64."
    );
  }

  const cleanTeams = tournament.teams.map(
    (team) => team.trim()
  );

  if (
    cleanTeams.length <
    MINIMUM_PARTICIPANTS
  ) {
    throw new Error(
      "Debes registrar al menos 2 participantes para generar la doble eliminación."
    );
  }

  if (
    cleanTeams.length >
    tournament.teamCount
  ) {
    throw new Error(
      "La cantidad de participantes supera la capacidad máxima del torneo."
    );
  }

  const hasEmptyTeams = cleanTeams.some(
    (team) => team.length === 0
  );

  if (hasEmptyTeams) {
    throw new Error(
      "Todos los participantes deben tener un nombre."
    );
  }

  const normalizedNames = cleanTeams.map(
    (team) => team.toLowerCase()
  );

  const hasDuplicatedTeams =
    normalizedNames.some(
      (team, index) =>
        normalizedNames.indexOf(team) !==
        index
    );

  if (hasDuplicatedTeams) {
    throw new Error(
      "No se permiten participantes con nombres repetidos."
    );
  }

  const participantCount =
    cleanTeams.length;

  const bracketSize =
    getNextPowerOfTwo(participantCount);

  if (bracketSize > tournament.teamCount) {
    throw new Error(
      "No se pudo crear la llave dentro de la capacidad máxima configurada."
    );
  }

  return {
    cleanTeams,
    participantCount,
    bracketSize,
  };
}

export function findDoubleMatch(
  bracket: DoubleTournamentBracket,
  matchId: string
): LocatedDoubleMatch | null {
  for (const round of bracket.winnerRounds) {
    const match = round.matches.find(
      (currentMatch) =>
        currentMatch.id === matchId
    );

    if (match) {
      return {
        match,
        round,
        section: "winner",
      };
    }
  }

  for (const round of bracket.loserRounds) {
    const match = round.matches.find(
      (currentMatch) =>
        currentMatch.id === matchId
    );

    if (match) {
      return {
        match,
        round,
        section: "loser",
      };
    }
  }

  if (
    bracket.grandFinal?.id === matchId
  ) {
    return {
      match: bracket.grandFinal,
      round: null,
      section: "grand-final",
    };
  }

  if (
    bracket.resetFinal?.id === matchId
  ) {
    return {
      match: bracket.resetFinal,
      round: null,
      section: "reset-final",
    };
  }

  return null;
}

function placeTeamInMatch(
  match: DoubleBracketMatch,
  position: MatchPosition,
  team: BracketTeam
): void {
  if (position === 1) {
    match.team1 = team;
  } else {
    match.team2 = team;
  }
}

function removeTeamFromMatch(
  match: DoubleBracketMatch,
  teamId: string
): void {
  if (match.team1?.id === teamId) {
    match.team1 = null;
  }

  if (match.team2?.id === teamId) {
    match.team2 = null;
  }
}

function getMatchWinner(
  match: DoubleBracketMatch
): BracketTeam | null {
  if (!match.winnerId) {
    return null;
  }

  if (
    match.team1?.id ===
    match.winnerId
  ) {
    return match.team1;
  }

  if (
    match.team2?.id ===
    match.winnerId
  ) {
    return match.team2;
  }

  return null;
}

function getMatchLoser(
  match: DoubleBracketMatch
): BracketTeam | null {
  if (!match.loserId) {
    return null;
  }

  if (
    match.team1?.id ===
    match.loserId
  ) {
    return match.team1;
  }

  if (
    match.team2?.id ===
    match.loserId
  ) {
    return match.team2;
  }

  return null;
}

function resetDoubleMatchState(
    
  match: DoubleBracketMatch
): void {
  match.score1 = 0;
  match.score2 = 0;
  match.winnerId = null;
  match.loserId = null;
  match.completed = false;
  match.automaticAdvance = false;
}
function createWinnerRounds(
  teams: BracketTeam[],
  bracketSize: number
): DoubleBracketRound[] {
  const totalRounds = Math.log2(bracketSize);
  const participantCount = teams.length;
  const byeCount = bracketSize - participantCount;

  const winnerRounds: DoubleBracketRound[] = [];

  let teamCursor = 0;

  for (
    let roundIndex = 0;
    roundIndex < totalRounds;
    roundIndex++
  ) {
    const matchCount =
      bracketSize /
      Math.pow(2, roundIndex + 1);

    const roundName = getWinnerRoundName(
      bracketSize,
      roundIndex
    );

    const matches: DoubleBracketMatch[] = [];

    for (
      let matchIndex = 0;
      matchIndex < matchCount;
      matchIndex++
    ) {
      const isFinalRound =
        roundIndex === totalRounds - 1;

      const nextMatchId = isFinalRound
        ? createGrandFinalId()
        : createWinnerMatchId(
            roundIndex + 1,
            Math.floor(matchIndex / 2)
          );

      const nextMatchPosition:
        | MatchPosition
        | null = isFinalRound
        ? 1
        : matchIndex % 2 === 0
          ? 1
          : 2;

      let team1: BracketTeam | null = null;
      let team2: BracketTeam | null = null;

      if (roundIndex === 0) {
        if (matchIndex < byeCount) {
          team1 = teams[teamCursor] ?? null;
          teamCursor += 1;
        } else {
          team1 = teams[teamCursor] ?? null;
          team2 = teams[teamCursor + 1] ?? null;
          teamCursor += 2;
        }
      }

      matches.push(
        createEmptyDoubleMatch({
          id: createWinnerMatchId(
            roundIndex,
            matchIndex
          ),

          roundIndex,
          matchIndex,
          roundName,
          section: "winner",

          team1,
          team2,

          nextMatchId,
          nextMatchPosition,

          loserNextMatchId:
            roundIndex === 0
              ? createLoserMatchId(
                  0,
                  Math.floor(matchIndex / 2)
                )
              : createLoserMatchId(
                  roundIndex * 2 - 1,
                  matchIndex
                ),

          loserNextMatchPosition:
            roundIndex === 0
              ? matchIndex % 2 === 0
                ? 1
                : 2
              : 2,
        })
      );
    }

    winnerRounds.push({
      id: `double-winner-round-${roundIndex}`,
      index: roundIndex,
      name: roundName,
      matchCount,
      section: "winner",
      matches,
    });
  }

  if (teamCursor !== participantCount) {
    throw new Error(
      "No se pudieron distribuir correctamente los participantes en el Winner Bracket."
    );
  }

  /*
   * Avanza automáticamente únicamente los BYEs
   * presentes en la primera ronda.
   */
  const firstRound = winnerRounds[0];

  if (firstRound) {
    for (const match of firstRound.matches) {
      const onlyTeam =
        match.team1 && !match.team2
          ? match.team1
          : match.team2 && !match.team1
            ? match.team2
            : null;

      if (!onlyTeam) {
        continue;
      }

      match.winnerId = onlyTeam.id;
      match.loserId = null;
      match.completed = true;
      match.automaticAdvance = true;

      if (
        match.nextMatchId &&
        match.nextMatchPosition
      ) {
        const nextRound = winnerRounds.find(
          (round) =>
            round.matches.some(
              (nextMatch) =>
                nextMatch.id === match.nextMatchId
            )
        );

        const nextMatch =
          nextRound?.matches.find(
            (currentMatch) =>
              currentMatch.id === match.nextMatchId
          );

        if (nextMatch) {
          placeTeamInMatch(
            nextMatch,
            match.nextMatchPosition,
            onlyTeam
          );
        }
      }
    }
  }

  return winnerRounds;
}

function createLoserRounds(
  bracketSize: number
): DoubleBracketRound[] {
  const winnerRoundCount =
    Math.log2(bracketSize);

  const totalLoserRounds =
    Math.max(
      0,
      winnerRoundCount * 2 - 2
    );

  const loserRounds:
    DoubleBracketRound[] = [];

  for (
    let roundIndex = 0;
    roundIndex < totalLoserRounds;
    roundIndex++
  ) {
    const matchCount =
      bracketSize /
      Math.pow(
        2,
        Math.floor(roundIndex / 2) + 2
      );

    const roundName =
      getLoserRoundName(
        roundIndex,
        totalLoserRounds
      );

    const matches:
      DoubleBracketMatch[] = [];

    for (
      let matchIndex = 0;
      matchIndex < matchCount;
      matchIndex++
    ) {
      const isLastLoserRound =
        roundIndex ===
        totalLoserRounds - 1;

      let nextMatchId:
        string | null = null;

      let nextMatchPosition:
        MatchPosition | null = null;

      if (isLastLoserRound) {
        nextMatchId =
          createGrandFinalId();

        nextMatchPosition = 2;
      } else if (roundIndex % 2 === 0) {
        nextMatchId =
          createLoserMatchId(
            roundIndex + 1,
            matchIndex
          );

        nextMatchPosition = 1;
      } else {
        nextMatchId =
          createLoserMatchId(
            roundIndex + 1,
            Math.floor(matchIndex / 2)
          );

        nextMatchPosition =
          matchIndex % 2 === 0
            ? 1
            : 2;
      }

      matches.push(
        createEmptyDoubleMatch({
          id: createLoserMatchId(
            roundIndex,
            matchIndex
          ),
          roundIndex,
          matchIndex,
          roundName,
          section: "loser",
          nextMatchId,
          nextMatchPosition,
          loserNextMatchId: null,
          loserNextMatchPosition: null,
        })
      );
    }

    loserRounds.push({
      id:
        `double-loser-round-${roundIndex}`,
      index: roundIndex,
      name: roundName,
      matchCount,
      section: "loser",
      matches,
    });
  }

  return loserRounds;
}

function createGrandFinal():
  DoubleBracketMatch {
  return createEmptyDoubleMatch({
    id: createGrandFinalId(),
    roundIndex: 0,
    matchIndex: 0,
    roundName: "Gran Final",
    section: "grand-final",
    nextMatchId:
      createResetFinalId(),
    nextMatchPosition: 1,
    loserNextMatchId: null,
    loserNextMatchPosition: null,
  });
}

function createResetFinal():
  DoubleBracketMatch {
  return createEmptyDoubleMatch({
    id: createResetFinalId(),
    roundIndex: 0,
    matchIndex: 0,
    roundName: "Final de reinicio",
    section: "reset-final",
    nextMatchId: null,
    nextMatchPosition: null,
    loserNextMatchId: null,
    loserNextMatchPosition: null,
  });
}

export function generateDoubleBracket(
  tournament: Tournament
): DoubleTournamentBracket {

  const {
    cleanTeams,
    participantCount,
    bracketSize,
  } = validateDoubleTournament(
    tournament
  );

  const teams =
    cleanTeams.map(
      createDoubleTeam
    );

  const winnerRounds =
    createWinnerRounds(
        
      teams,
      bracketSize
    );

  const loserRounds =
    createLoserRounds(
      bracketSize
    );

  const grandFinal =
    createGrandFinal();

  const resetFinal =
    createResetFinal();

  const now =
    new Date().toISOString();

  return {

    tournamentId:
      tournament.id ??
      `double-${Date.now()}`,

    tournamentName:
      tournament.name,

    game:
      tournament.game,

    teamCount:
      bracketSize,

    participantCount,

    capacity:
      tournament.teamCount,

    createdAt:
      now,

    updatedAt:
      now,

    winnerRounds,

    loserRounds,

    grandFinal,

    resetFinal,

    champion:
      null,

  };

}