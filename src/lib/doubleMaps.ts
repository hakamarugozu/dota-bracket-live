export type DoubleMapPosition = 1 | 2;

export type LoserDestination = {
  matchId: string;
  position: DoubleMapPosition;
};

export type WinnerDestination = {
  matchId: string;
  position: DoubleMapPosition;
};

export type DoubleMatchMapEntry = {
  winner?: WinnerDestination;
  loser?: LoserDestination;
};

export type DoubleBracketMap = Record<
  string,
  DoubleMatchMapEntry
>;

export const DOUBLE_MAP_8: DoubleBracketMap = {
  "double-winner-round-0-match-0": {
    winner: {
      matchId: "double-winner-round-1-match-0",
      position: 1,
    },
    loser: {
      matchId: "double-loser-round-0-match-0",
      position: 1,
    },
  },

  "double-winner-round-0-match-1": {
    winner: {
      matchId: "double-winner-round-1-match-0",
      position: 2,
    },
    loser: {
      matchId: "double-loser-round-0-match-0",
      position: 2,
    },
  },

  "double-winner-round-0-match-2": {
    winner: {
      matchId: "double-winner-round-1-match-1",
      position: 1,
    },
    loser: {
      matchId: "double-loser-round-0-match-1",
      position: 1,
    },
  },

  "double-winner-round-0-match-3": {
    winner: {
      matchId: "double-winner-round-1-match-1",
      position: 2,
    },
    loser: {
      matchId: "double-loser-round-0-match-1",
      position: 2,
    },
  },

  "double-winner-round-1-match-0": {
    winner: {
      matchId: "double-winner-round-2-match-0",
      position: 1,
    },
    loser: {
      matchId: "double-loser-round-1-match-0",
      position: 2,
    },
  },

  "double-winner-round-1-match-1": {
    winner: {
      matchId: "double-winner-round-2-match-0",
      position: 2,
    },
    loser: {
      matchId: "double-loser-round-1-match-1",
      position: 2,
    },
  },

  "double-winner-round-2-match-0": {
    winner: {
      matchId: "double-grand-final",
      position: 1,
    },
    loser: {
      matchId: "double-loser-round-3-match-0",
      position: 2,
    },
  },

  "double-loser-round-0-match-0": {
    winner: {
      matchId: "double-loser-round-1-match-0",
      position: 1,
    },
  },

  "double-loser-round-0-match-1": {
    winner: {
      matchId: "double-loser-round-1-match-1",
      position: 1,
    },
  },

  "double-loser-round-1-match-0": {
    winner: {
      matchId: "double-loser-round-2-match-0",
      position: 1,
    },
  },

  "double-loser-round-1-match-1": {
    winner: {
      matchId: "double-loser-round-2-match-0",
      position: 2,
    },
  },

  "double-loser-round-2-match-0": {
    winner: {
      matchId: "double-loser-round-3-match-0",
      position: 1,
    },
  },

  "double-loser-round-3-match-0": {
    winner: {
      matchId: "double-grand-final",
      position: 2,
    },
  },

  "double-grand-final": {
    winner: {
      matchId: "double-reset-final",
      position: 1,
    },
  },
};

export function getDoubleBracketMap(
  bracketSize: number
): DoubleBracketMap {
  if (bracketSize === 8) {
    return DOUBLE_MAP_8;
  }

  throw new Error(
    `Todavía no existe un mapa de doble eliminación para ${bracketSize} participantes.`
  );
}