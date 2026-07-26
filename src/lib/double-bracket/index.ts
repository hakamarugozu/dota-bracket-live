export type {
  BracketSection,
  DoubleBracketMatch,
  DoubleBracketRound,
  DoubleTournamentBracket,
  LocatedDoubleMatch,
  MatchPosition,
  Tournament,
  TournamentBracket,
  BracketRound,
  BracketMatch,
  BracketTeam,
} from "./types";

export {
  findDoubleMatch,
  placeTeamInMatch,
  removeTeamFromMatch,
  getMatchWinner,
  getMatchLoser,
  resetDoubleMatchState,
  getAllRounds,
  isMatchReady,
  isEliminated,
} from "./helpers";

export {
  generateDoubleBracket,
} from "./generator";

export {
  setDoubleMatchResultAndAdvance,
} from "./advance";

export {
  resetDoubleMatchWinner,
} from "./reset";

export {
  calculateChampion,
  updateDoubleBracketChampion,
  hasDoubleBracketChampion,
} from "./champion";