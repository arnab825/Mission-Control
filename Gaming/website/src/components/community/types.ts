export type { Issue } from "@/lib/issues-db";
export type { GameRatingItem, RatingStats, GameRatingMedia } from "@/lib/benchmarks-db";

export interface IssueStats {
  total: number;
  glitches: number;
  hardware: number;
  performance: number;
}
