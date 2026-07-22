export type TournamentGame =
  | "Dota 1"
  | "Dota 2";

export type Tournament = {
  id?: string;
  name: string;
  game: TournamentGame | string;
  teamCount: number;
  teams: string[];
  createdAt?: string;
};

export type BracketTeam = {
  id: string;
  name: string;
  seed: number;
};

export type BracketMatch = {
  id: string;
  roundIndex: number;
  matchIndex: number;
  roundName: string;

  team1: BracketTeam | null;
  team2: BracketTeam | null;

  score1: number;
  score2: number;

  winnerId: string | null;
  completed: boolean;

  nextMatchId: string | null;
  nextMatchPosition: 1 | 2 | null;
};

export type BracketRound = {
  id: string;
  index: number;
  name: string;
  matchCount: number;
  matches: BracketMatch[];
};

export type TournamentBracket = {
  tournamentId: string;
  tournamentName: string;
  game: string;
  teamCount: number;
  createdAt: string;
  updatedAt: string;
  rounds: BracketRound[];
  champion: BracketTeam | null;
};

const SUPPORTED_TEAM_COUNTS = [
  8,
  16,
  32,
  64,
];

export function isSupportedTeamCount(
  teamCount: number
) {
  return SUPPORTED_TEAM_COUNTS.includes(
    teamCount
  );
}

export function getSupportedTeamCounts() {
  return [...SUPPORTED_TEAM_COUNTS];
}

export function getRoundName(
  totalTeams: number,
  roundIndex: number
): string {
  const teamsRemaining =
    totalTeams / Math.pow(2, roundIndex);

  if (teamsRemaining === 64) {
    return "Ronda de 64";
  }

  if (teamsRemaining === 32) {
    return "Dieciseisavos de final";
  }

  if (teamsRemaining === 16) {
    return "Octavos de final";
  }

  if (teamsRemaining === 8) {
    return "Cuartos de final";
  }

  if (teamsRemaining === 4) {
    return "Semifinales";
  }

  if (teamsRemaining === 2) {
    return "Gran final";
  }

  return `Ronda ${roundIndex + 1}`;
}

function createTeam(
  name: string,
  index: number
): BracketTeam {
  return {
    id: `team-${index + 1}`,
    name,
    seed: index + 1,
  };
}

function createMatchId(
  roundIndex: number,
  matchIndex: number
) {
  return `round-${roundIndex}-match-${matchIndex}`;
}

export function generateBracket(
  tournament: Tournament
): TournamentBracket {
  if (
    !isSupportedTeamCount(
      tournament.teamCount
    )
  ) {
    throw new Error(
      "La cantidad de equipos debe ser 8, 16, 32 o 64."
    );
  }

  if (
    tournament.teams.length !==
    tournament.teamCount
  ) {
    throw new Error(
      "La cantidad de nombres de equipos no coincide con el torneo."
    );
  }

  const cleanTeams =
    tournament.teams.map((team) =>
      team.trim()
    );

  const hasEmptyTeams =
    cleanTeams.some(
      (team) => team.length === 0
    );

  if (hasEmptyTeams) {
    throw new Error(
      "Todos los equipos deben tener un nombre."
    );
  }

  const normalizedNames =
    cleanTeams.map((team) =>
      team.toLowerCase()
    );

  const hasDuplicatedTeams =
    normalizedNames.some(
      (team, index) =>
        normalizedNames.indexOf(team) !==
        index
    );

  if (hasDuplicatedTeams) {
    throw new Error(
      "No se permiten equipos con nombres repetidos."
    );
  }

  const bracketTeams =
    cleanTeams.map(createTeam);

  const totalRounds = Math.log2(
    tournament.teamCount
  );

  const rounds: BracketRound[] = [];

  for (
    let roundIndex = 0;
    roundIndex < totalRounds;
    roundIndex++
  ) {
    const matchCount =
      tournament.teamCount /
      Math.pow(2, roundIndex + 1);

    const roundName = getRoundName(
      tournament.teamCount,
      roundIndex
    );

    const matches: BracketMatch[] = [];

    for (
      let matchIndex = 0;
      matchIndex < matchCount;
      matchIndex++
    ) {
      const matchId = createMatchId(
        roundIndex,
        matchIndex
      );

      const isLastRound =
        roundIndex === totalRounds - 1;

      const nextMatchId = isLastRound
        ? null
        : createMatchId(
            roundIndex + 1,
            Math.floor(matchIndex / 2)
          );

      const nextMatchPosition:
        | 1
        | 2
        | null = isLastRound
        ? null
        : matchIndex % 2 === 0
          ? 1
          : 2;

      let team1: BracketTeam | null =
        null;

      let team2: BracketTeam | null =
        null;

      if (roundIndex === 0) {
        team1 =
          bracketTeams[
            matchIndex * 2
          ] || null;

        team2 =
          bracketTeams[
            matchIndex * 2 + 1
          ] || null;
      }

      matches.push({
        id: matchId,
        roundIndex,
        matchIndex,
        roundName,
        team1,
        team2,
        score1: 0,
        score2: 0,
        winnerId: null,
        completed: false,
        nextMatchId,
        nextMatchPosition,
      });
    }

    rounds.push({
      id: `round-${roundIndex}`,
      index: roundIndex,
      name: roundName,
      matchCount,
      matches,
    });
  }

  const now =
    new Date().toISOString();

  return {
    tournamentId:
      tournament.id ||
      `tournament-${Date.now()}`,
    tournamentName: tournament.name,
    game: tournament.game,
    teamCount: tournament.teamCount,
    createdAt: now,
    updatedAt: now,
    rounds,
    champion: null,
  };
}

export function findMatch(
  bracket: TournamentBracket,
  matchId: string
): BracketMatch | null {
  for (const round of bracket.rounds) {
    const match =
      round.matches.find(
        (currentMatch) =>
          currentMatch.id === matchId
      );

    if (match) {
      return match;
    }
  }

  return null;
}

export function updateMatchScore(
  bracket: TournamentBracket,
  matchId: string,
  score1: number,
  score2: number
): TournamentBracket {
  const safeScore1 = Math.max(
    0,
    Math.floor(
      Number(score1) || 0
    )
  );

  const safeScore2 = Math.max(
    0,
    Math.floor(
      Number(score2) || 0
    )
  );

  return {
    ...bracket,
    updatedAt:
      new Date().toISOString(),
    rounds: bracket.rounds.map(
      (round) => ({
        ...round,
        matches: round.matches.map(
          (match) =>
            match.id === matchId
              ? {
                  ...match,
                  score1: safeScore1,
                  score2: safeScore2,
                }
              : match
        ),
      })
    ),
  };
}

export function advanceWinner(
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string
): TournamentBracket {
  const clonedBracket:
    TournamentBracket =
    structuredClone(bracket);

  const currentMatch = findMatch(
    clonedBracket,
    matchId
  );

  if (!currentMatch) {
    throw new Error(
      "No se encontró el partido."
    );
  }

  if (
    !currentMatch.team1 ||
    !currentMatch.team2
  ) {
    throw new Error(
      "Los dos equipos deben estar definidos antes de avanzar un ganador."
    );
  }

  const selectedWinner =
    currentMatch.team1.id === winnerId
      ? currentMatch.team1
      : currentMatch.team2.id ===
          winnerId
        ? currentMatch.team2
        : null;

  if (!selectedWinner) {
    throw new Error(
      "El equipo seleccionado no pertenece a este partido."
    );
  }

  const selectedScore =
    currentMatch.team1.id === winnerId
      ? currentMatch.score1
      : currentMatch.score2;

  const opponentScore =
    currentMatch.team1.id === winnerId
      ? currentMatch.score2
      : currentMatch.score1;

  if (selectedScore <= opponentScore) {
    throw new Error(
      "El equipo ganador debe tener un marcador superior."
    );
  }

  currentMatch.winnerId =
    selectedWinner.id;

  currentMatch.completed = true;

  if (
    currentMatch.nextMatchId &&
    currentMatch.nextMatchPosition
  ) {
    const nextMatch = findMatch(
      clonedBracket,
      currentMatch.nextMatchId
    );

    if (!nextMatch) {
      throw new Error(
        "No se encontró el siguiente partido."
      );
    }

    if (
      currentMatch.nextMatchPosition ===
      1
    ) {
      nextMatch.team1 =
        selectedWinner;
    } else {
      nextMatch.team2 =
        selectedWinner;
    }
  } else {
    clonedBracket.champion =
      selectedWinner;
  }

  clonedBracket.updatedAt =
    new Date().toISOString();

  return clonedBracket;
}

export function setMatchResultAndAdvance(
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string,
  winnerScore: number,
  loserScore: number
): TournamentBracket {
  const safeWinnerScore =
    Math.max(
      1,
      Math.floor(
        Number(winnerScore) || 0
      )
    );

  const safeLoserScore =
    Math.max(
      0,
      Math.floor(
        Number(loserScore) || 0
      )
    );

  if (
    safeWinnerScore <=
    safeLoserScore
  ) {
    throw new Error(
      "El marcador del ganador debe ser superior al del rival."
    );
  }

  let workingBracket = bracket;

  const currentMatch = findMatch(
    workingBracket,
    matchId
  );

  if (!currentMatch) {
    throw new Error(
      "No se encontró el partido."
    );
  }

  if (
    currentMatch.completed &&
    currentMatch.winnerId !==
      winnerId
  ) {
    workingBracket =
      resetMatchWinner(
        workingBracket,
        matchId
      );
  }

  const refreshedMatch = findMatch(
    workingBracket,
    matchId
  );

  if (
    !refreshedMatch?.team1 ||
    !refreshedMatch.team2
  ) {
    throw new Error(
      "Los dos equipos deben estar definidos antes de registrar el resultado."
    );
  }

  const winnerIsTeam1 =
    refreshedMatch.team1.id ===
    winnerId;

  if (
    !winnerIsTeam1 &&
    refreshedMatch.team2.id !==
      winnerId
  ) {
    throw new Error(
      "El equipo seleccionado no pertenece a este partido."
    );
  }

  workingBracket =
    updateMatchScore(
      workingBracket,
      matchId,
      winnerIsTeam1
        ? safeWinnerScore
        : safeLoserScore,
      winnerIsTeam1
        ? safeLoserScore
        : safeWinnerScore
    );

  return advanceWinner(
    workingBracket,
    matchId,
    winnerId
  );
}

export function resetMatchWinner(
  bracket: TournamentBracket,
  matchId: string
): TournamentBracket {
  const clonedBracket:
    TournamentBracket =
    structuredClone(bracket);

  const currentMatch = findMatch(
    clonedBracket,
    matchId
  );

  if (!currentMatch) {
    throw new Error(
      "No se encontró el partido."
    );
  }

  const previousWinnerId =
    currentMatch.winnerId;

  currentMatch.winnerId = null;
  currentMatch.completed = false;
  currentMatch.score1 = 0;
  currentMatch.score2 = 0;

  if (
    currentMatch.nextMatchId &&
    currentMatch.nextMatchPosition
  ) {
    const nextMatch = findMatch(
      clonedBracket,
      currentMatch.nextMatchId
    );

    if (nextMatch) {
      if (
        currentMatch.nextMatchPosition ===
          1 &&
        nextMatch.team1?.id ===
          previousWinnerId
      ) {
        nextMatch.team1 = null;
      }

      if (
        currentMatch.nextMatchPosition ===
          2 &&
        nextMatch.team2?.id ===
          previousWinnerId
      ) {
        nextMatch.team2 = null;
      }

      clearFutureMatch(
        clonedBracket,
        nextMatch.id
      );
    }
  } else {
    clonedBracket.champion = null;
  }

  clonedBracket.updatedAt =
    new Date().toISOString();

  return clonedBracket;
}

function clearFutureMatch(
  bracket: TournamentBracket,
  matchId: string
) {
  const match = findMatch(
    bracket,
    matchId
  );

  if (!match) {
    return;
  }

  const oldWinnerId =
    match.winnerId;

  match.winnerId = null;
  match.completed = false;
  match.score1 = 0;
  match.score2 = 0;

  if (
    match.nextMatchId &&
    match.nextMatchPosition
  ) {
    const nextMatch = findMatch(
      bracket,
      match.nextMatchId
    );

    if (nextMatch) {
      if (
        match.nextMatchPosition ===
          1 &&
        nextMatch.team1?.id ===
          oldWinnerId
      ) {
        nextMatch.team1 = null;
      }

      if (
        match.nextMatchPosition ===
          2 &&
        nextMatch.team2?.id ===
          oldWinnerId
      ) {
        nextMatch.team2 = null;
      }

      clearFutureMatch(
        bracket,
        nextMatch.id
      );
    }
  } else {
    bracket.champion = null;
  }
}

function normalizeBracket(
  bracket: TournamentBracket
): TournamentBracket {
  return {
    ...bracket,
    rounds: bracket.rounds.map(
      (round) => ({
        ...round,
        matches: round.matches.map(
          (match) => ({
            ...match,
            score1: Math.max(
              0,
              Math.floor(
                Number(match.score1) ||
                  0
              )
            ),
            score2: Math.max(
              0,
              Math.floor(
                Number(match.score2) ||
                  0
              )
            ),
          })
        ),
      })
    ),
  };
}

export function saveBracket(
  bracket: TournamentBracket
) {
  localStorage.setItem(
    "currentBracket",
    JSON.stringify(bracket)
  );
}

export function loadBracket():
  | TournamentBracket
  | null {
  const savedBracket =
    localStorage.getItem(
      "currentBracket"
    );

  if (!savedBracket) {
    return null;
  }

  try {
    const parsedBracket =
      JSON.parse(
        savedBracket
      ) as TournamentBracket;

    return normalizeBracket(
      parsedBracket
    );
  } catch {
    localStorage.removeItem(
      "currentBracket"
    );

    return null;
  }
}