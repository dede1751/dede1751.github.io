/* tslint:disable */
/* eslint-disable */
export enum ScoreType {
  Cp = 0,
  Mate = 1,
  Mated = 2,
}
export class CarpEngine {
  free(): void;
  constructor();
  reset(): void;
  resize_tt(size_mb: number): void;
  perft(pos_str: string, depth: number): void;
  search(pos_str: string, tc_str: string): void;
}
export class PerftOutput {
  private constructor();
  free(): void;
  asObject(): any;
  time: bigint;
  nodes: bigint;
  nps: number;
  get mov(): string | undefined;
  set mov(value: string | null | undefined);
}
export class Score {
  private constructor();
  free(): void;
  val: number;
  w: number;
  d: number;
  l: number;
}
export class SearchOutput {
  private constructor();
  free(): void;
  asObject(): any;
  time: bigint;
  nodes: bigint;
  nps: number;
  depth: number;
  score_type: ScoreType;
  score: Score;
  pv: string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_carpengine_free: (a: number, b: number) => void;
  readonly __wbg_perftoutput_free: (a: number, b: number) => void;
  readonly __wbg_get_perftoutput_time: (a: number) => bigint;
  readonly __wbg_set_perftoutput_time: (a: number, b: bigint) => void;
  readonly __wbg_get_perftoutput_nodes: (a: number) => bigint;
  readonly __wbg_set_perftoutput_nodes: (a: number, b: bigint) => void;
  readonly __wbg_get_perftoutput_nps: (a: number) => number;
  readonly __wbg_set_perftoutput_nps: (a: number, b: number) => void;
  readonly __wbg_get_perftoutput_mov: (a: number) => [number, number];
  readonly __wbg_set_perftoutput_mov: (a: number, b: number, c: number) => void;
  readonly __wbg_score_free: (a: number, b: number) => void;
  readonly __wbg_get_score_val: (a: number) => number;
  readonly __wbg_set_score_val: (a: number, b: number) => void;
  readonly __wbg_get_score_w: (a: number) => number;
  readonly __wbg_set_score_w: (a: number, b: number) => void;
  readonly __wbg_get_score_d: (a: number) => number;
  readonly __wbg_set_score_d: (a: number, b: number) => void;
  readonly __wbg_get_score_l: (a: number) => number;
  readonly __wbg_set_score_l: (a: number, b: number) => void;
  readonly __wbg_searchoutput_free: (a: number, b: number) => void;
  readonly __wbg_get_searchoutput_time: (a: number) => bigint;
  readonly __wbg_set_searchoutput_time: (a: number, b: bigint) => void;
  readonly __wbg_get_searchoutput_nodes: (a: number) => bigint;
  readonly __wbg_set_searchoutput_nodes: (a: number, b: bigint) => void;
  readonly __wbg_get_searchoutput_nps: (a: number) => number;
  readonly __wbg_set_searchoutput_nps: (a: number, b: number) => void;
  readonly __wbg_get_searchoutput_depth: (a: number) => number;
  readonly __wbg_set_searchoutput_depth: (a: number, b: number) => void;
  readonly __wbg_get_searchoutput_score_type: (a: number) => number;
  readonly __wbg_set_searchoutput_score_type: (a: number, b: number) => void;
  readonly __wbg_get_searchoutput_score: (a: number) => number;
  readonly __wbg_set_searchoutput_score: (a: number, b: number) => void;
  readonly __wbg_get_searchoutput_pv: (a: number) => [number, number];
  readonly __wbg_set_searchoutput_pv: (a: number, b: number, c: number) => void;
  readonly perftoutput_asObject: (a: number) => [number, number, number];
  readonly searchoutput_asObject: (a: number) => [number, number, number];
  readonly carpengine_new: () => number;
  readonly carpengine_reset: (a: number) => void;
  readonly carpengine_resize_tt: (a: number, b: number) => void;
  readonly carpengine_perft: (a: number, b: number, c: number, d: number) => void;
  readonly carpengine_search: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
