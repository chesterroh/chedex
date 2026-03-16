export type ReasoningEffort = 'low' | 'medium' | 'high';
export type ToolPolicy = 'read-only' | 'analysis' | 'execution';

export interface RoleDefinition {
  id: string;
  summary: string;
  goal: string;
  posture: 'fast-lane' | 'deep-worker' | 'read-only-reviewer';
  default_effort: ReasoningEffort;
  tool_policy: ToolPolicy;
  done_definition: string;
  handoff_targets: string[];
}

import { ROLE_DEFINITIONS as ROLE_DEFINITIONS_SOURCE } from './agent-definitions.mjs';

export const ROLE_DEFINITIONS = ROLE_DEFINITIONS_SOURCE as Record<string, RoleDefinition>;
