export type ApprovalVerdict = 'approved' | 'rejected' | 'incomplete';
export type VerificationReviewVerdict = 'pass' | 'fail' | 'incomplete';
export type HandoffPolicy = 'required' | 'optional';

export interface WorkflowModeSchema {
  id: string;
  phases: string[];
  handoff_policy: HandoffPolicy;
  required_artifacts: string[];
  required_disk_artifacts: string[];
  required_handoff_approvals: string[];
  completion_review_role: string;
}

import {
  APPROVAL_VERDICTS as APPROVAL_VERDICTS_SOURCE,
  MODE_SCHEMAS as MODE_SCHEMAS_SOURCE,
  VERIFICATION_REVIEW_VERDICTS as VERIFICATION_REVIEW_VERDICTS_SOURCE,
} from './workflow-mode-schemas.mjs';

export const APPROVAL_VERDICTS = APPROVAL_VERDICTS_SOURCE as Set<ApprovalVerdict>;
export const VERIFICATION_REVIEW_VERDICTS =
  VERIFICATION_REVIEW_VERDICTS_SOURCE as Set<VerificationReviewVerdict>;
export const MODE_SCHEMAS = MODE_SCHEMAS_SOURCE as Record<string, WorkflowModeSchema>;
