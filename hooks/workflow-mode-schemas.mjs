export const APPROVAL_VERDICTS = new Set(['approved', 'rejected', 'incomplete']);
export const VERIFICATION_REVIEW_VERDICTS = new Set(['pass', 'fail', 'incomplete']);

export const MODE_SCHEMAS = {
  autopilot: {
    id: 'autopilot',
    phases: ['clarify', 'specify', 'plan', 'execute', 'verify', 'validate', 'closeout'],
    handoff_policy: 'required',
    required_artifacts: ['handoff'],
    required_disk_artifacts: [],
    required_handoff_approvals: ['architect', 'verifier'],
    completion_review_role: 'verifier',
  },
  'autoresearch-loop': {
    id: 'autoresearch-loop',
    phases: ['ground', 'baseline', 'experiment', 'decide', 'execute', 'verify', 'validate', 'closeout'],
    handoff_policy: 'required',
    required_artifacts: ['spec', 'results', 'handoff', 'verify'],
    required_disk_artifacts: ['spec', 'results', 'verify'],
    required_handoff_approvals: ['architect', 'verifier'],
    completion_review_role: 'verifier',
  },
  ralph: {
    id: 'ralph',
    phases: ['ground', 'plan', 'execute', 'verify', 'validate', 'closeout'],
    handoff_policy: 'required',
    required_artifacts: ['handoff'],
    required_disk_artifacts: [],
    required_handoff_approvals: ['architect', 'verifier'],
    completion_review_role: 'verifier',
  },
  ultrawork: {
    id: 'ultrawork',
    phases: ['fanout', 'execute', 'verify', 'validate', 'closeout'],
    handoff_policy: 'optional',
    required_artifacts: [],
    required_disk_artifacts: [],
    required_handoff_approvals: [],
    completion_review_role: 'verifier',
  },
};
