import type {
  Tournament,
  TournamentBracket,
  BracketRound,
  BracketMatch,
  BracketTeam,
} from "../bracket";

export type BracketSection =
  | "winner"
  | "loser"
  | "grand-final"
  | "reset-final";

export interface DoubleBracketMatch extends BracketMatch {
  section: BracketSection;

  loserNextMatchId: string | null;

  loserNextMatchPosition: 1 | 2 | null;

  loserId: string | null;

  automaticAdvance: boolean;
}

export interface DoubleBracketRound
  extends Omit<BracketRound, "matches"> {
  section: BracketSection;

  matches: DoubleBracketMatch[];
}

export interface DoubleTournamentBracket
  extends Omit<TournamentBracket, "rounds"> {
  winnerRounds: DoubleBracketRound[];

  loserRounds: DoubleBracketRound[];

  grandFinal: DoubleBracketMatch | null;

  resetFinal: DoubleBracketMatch | null;
}

export interface LocatedDoubleMatch {
  match: DoubleBracketMatch;

  round: DoubleBracketRound | null;

  section: BracketSection;
}

export type MatchPosition = 1 | 2;

export type {
  Tournament,
  TournamentBracket,
  BracketRound,
  BracketMatch,
  BracketTeam,
};