import { invoke } from "@tauri-apps/api/core";

export type Result<T, E = string> = { ok: true; data: T } | { ok: false; error: E };
export function ok<T>(data: T): Result<T> { return { ok: true, data }; }
export function err<E extends string>(error: E): Result<never, E> { return { ok: false, error }; }

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<Result<T>> {
  try { const data = await invoke<T>(cmd, args); return ok(data); }
  catch (e) { const message = e instanceof Error ? e.message : String(e); return err(message); }
}

import type { Tag, Mark } from "../types/tag";
export async function invokeListAllTags(): Promise<Result<Tag[]>> { return safeInvoke<Tag[]>("list_all_tags"); }
export async function invokeListAllMarks(): Promise<Result<Mark[]>> { return safeInvoke<Mark[]>("list_all_marks"); }
export async function invokeGetTagByName(name: string): Promise<Result<Tag | null>> { return safeInvoke<Tag | null>("get_tag_by_name", { name }); }
export async function invokeGetTagById(id: string): Promise<Result<Tag | null>> { return safeInvoke<Tag | null>("get_tag_by_id", { id }); }

import type { ParseResult, Card, CardValidation, ParseStats } from "../types/parser";
export async function invokeParseCard(name: string, text: string): Promise<Result<ParseResult>> { return safeInvoke<ParseResult>("parse_card", { name, text }); }
export async function invokeParseAllCards(): Promise<Result<Card[]>> { return safeInvoke<Card[]>("parse_all_cards"); }
export async function invokeValidateAllCards(): Promise<Result<CardValidation[]>> { return safeInvoke<CardValidation[]>("validate_all_cards"); }
export async function invokeParseStats(): Promise<Result<ParseStats>> { return safeInvoke<ParseStats>("parse_stats"); }
export async function invokeCreateCard(name: string, tags: string[], text: string): Promise<Result<Card>> { return safeInvoke<Card>("create_card", { name, tags, text }); }
export async function invokeUpdateCard(id: string, name?: string, tags?: string[], text?: string): Promise<Result<Card>> { return safeInvoke<Card>("update_card", { id, name, tags, text }); }
export async function invokeDeleteCard(id: string): Promise<Result<boolean>> { return safeInvoke<boolean>("delete_card", { id }); }
export async function invokeGetCard(id: string): Promise<Result<Card | null>> { return safeInvoke<Card | null>("get_card", { id }); }
export async function invokeSaveCards(dataDir?: string): Promise<Result<number>> { return safeInvoke<number>("save_cards", { dataDir }); }
export async function invokeLoadCards(dataDir: string): Promise<Result<Card[]>> { return safeInvoke<Card[]>("load_cards", { dataDir }); }

import type { DuelState, EffectLogEntry, Scenario, ScenarioMatch, CardInfo, PhaseInfo } from "../types/duel";
export async function invokeInitDuel(scenarioId: string): Promise<Result<DuelState>> { return safeInvoke<DuelState>("init_duel", { scenarioId }); }
export async function invokeExecuteTurn(): Promise<Result<DuelState>> { return safeInvoke<DuelState>("execute_turn"); }
export async function invokeGetDuelState(): Promise<Result<DuelState | null>> { return safeInvoke<DuelState | null>("get_duel_state"); }
export async function invokeGetEffectLog(): Promise<Result<EffectLogEntry[]>> { return safeInvoke<EffectLogEntry[]>("get_effect_log"); }
export async function invokeListDuelScenarios(): Promise<Result<Scenario[]>> { return safeInvoke<Scenario[]>("list_duel_scenarios"); }
export async function invokeListDuelScenariosWithMatches(cardPool: CardInfo[]): Promise<Result<ScenarioMatch[]>> { return safeInvoke<ScenarioMatch[]>("list_duel_scenarios_with_matches", { cardPool }); }
export async function invokeGetDuelPhaseInfo(): Promise<Result<PhaseInfo[]>> { return safeInvoke<PhaseInfo[]>("get_duel_phase_info"); }

// DevTools
import type { CheckResult, HealthReport, ErrorEntry } from "../types/devtools";
export async function invokeRunFullHealthCheck(): Promise<Result<HealthReport>> { return safeInvoke<HealthReport>("run_full_health_check"); }
export async function invokeRunSingleCheck(name: string): Promise<Result<CheckResult>> { return safeInvoke<CheckResult>("run_single_check", { name }); }
export async function invokeGetErrorLog(): Promise<Result<ErrorEntry[]>> { return safeInvoke<ErrorEntry[]>("get_error_log"); }
export async function invokeClearErrorLog(): Promise<Result<boolean>> { return safeInvoke<boolean>("clear_error_log"); }
export async function invokeGetErrorSummary(): Promise<Result<[string, number][]>> { return safeInvoke<[string, number][]>("get_error_summary"); }

// Data Governance
import type { JsonValidationResult, DuplicatePair, ImportResult } from "../types/data_gov";
export async function invokeValidateCards(): Promise<Result<JsonValidationResult>> { return safeInvoke<JsonValidationResult>("validate_cards"); }
export async function invokeDetectDuplicates(): Promise<Result<DuplicatePair[]>> { return safeInvoke<DuplicatePair[]>("detect_duplicates"); }
export async function invokeExportCards(ids: string[]): Promise<Result<string>> { return safeInvoke<string>("export_cards", { ids }); }
export async function invokeImportCards(jsonStr: string): Promise<Result<ImportResult>> { return safeInvoke<ImportResult>("import_cards", { jsonStr }); }