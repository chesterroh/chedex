export const APPROVAL_VERDICTS = new Set(['approved', 'rejected', 'incomplete']);
export const VERIFICATION_REVIEW_VERDICTS = new Set(['pass', 'fail', 'incomplete']);

export const MODE_SCHEMAS = {
  autopilot: {
    id: 'autopilot',
    phases: ['clarify', 'specify', 'plan', 'execute', 'verify', 'validate', 'closeout'],
    handoff_policy: 'phase-required',
    required_artifacts: [],
    required_disk_artifacts: [],
    phase_artifact_requirements: [
      { phase: 'specify', artifacts: ['context'] },
      { phase: 'plan', artifacts: ['spec'] },
      { phase: 'execute', artifacts: ['plan', 'handoff'] },
      { phase: 'verify', artifacts: ['verify'] },
    ],
    phase_disk_artifact_requirements: [
      { phase: 'specify', artifacts: ['context'] },
      { phase: 'plan', artifacts: ['spec'] },
      { phase: 'execute', artifacts: ['plan'] },
      { phase: 'verify', artifacts: ['verify'] },
    ],
    terminal_artifacts: ['verify'],
    terminal_disk_artifacts: ['verify'],
    required_handoff_approvals: ['architect', 'verifier'],
    completion_review_role: 'verifier',
  },
  'autoresearch-loop': {
    id: 'autoresearch-loop',
    phases: ['ground', 'baseline', 'experiment', 'decide', 'execute', 'verify', 'validate', 'closeout'],
    handoff_policy: 'required',
    required_artifacts: ['spec', 'results', 'handoff', 'verify'],
    required_disk_artifacts: ['spec', 'results', 'verify'],
    phase_artifact_requirements: [],
    phase_disk_artifact_requirements: [],
    terminal_artifacts: ['verify'],
    terminal_disk_artifacts: ['verify'],
    required_handoff_approvals: ['architect', 'verifier'],
    completion_review_role: 'verifier',
  },
  ralph: {
    id: 'ralph',
    phases: ['ground', 'plan', 'execute', 'verify', 'validate', 'closeout'],
    handoff_policy: 'phase-required',
    required_artifacts: [],
    required_disk_artifacts: [],
    phase_artifact_requirements: [
      { phase: 'execute', artifacts: ['plan', 'handoff'] },
      { phase: 'verify', artifacts: ['verify'] },
    ],
    phase_disk_artifact_requirements: [
      { phase: 'execute', artifacts: ['plan'] },
      { phase: 'verify', artifacts: ['verify'] },
    ],
    terminal_artifacts: ['verify'],
    terminal_disk_artifacts: ['verify'],
    required_handoff_approvals: ['architect', 'verifier'],
    completion_review_role: 'verifier',
  },
  ultrawork: {
    id: 'ultrawork',
    phases: ['fanout', 'execute', 'verify', 'validate', 'closeout'],
    handoff_policy: 'optional',
    required_artifacts: [],
    required_disk_artifacts: [],
    phase_artifact_requirements: [
      { phase: 'verify', artifacts: ['verify'] },
    ],
    phase_disk_artifact_requirements: [
      { phase: 'verify', artifacts: ['verify'] },
    ],
    terminal_artifacts: ['verify'],
    terminal_disk_artifacts: ['verify'],
    required_handoff_approvals: [],
    completion_review_role: 'verifier',
  },
};
