# Examples

These examples show how different tasks can be normalized into the same planning shape before `autoresearch-loop` runs them.

## Example 1: Model Training Repo

User task:
Improve validation loss on this small training setup overnight.

Normalization:

- `objective`: reduce validation loss
- `primary_metric`: validation BPB or loss
- `fixed_layer`: dataset, tokenizer, eval harness, time budget
- `mutable_layer`: model architecture, optimizer, schedules, batch sizes, selected training code
- `entrypoint`: baseline run plus one experiment run command
- `ledger`: one row per experiment with metric, memory, status, description

## Example 2: Prompt Optimization

User task:
Make this support prompt produce more accurate extraction outputs.

Normalization:

- `objective`: improve extraction quality
- `primary_metric`: exact-match rate, rubric score, or eval pass rate
- `fixed_layer`: evaluation dataset, grading rubric, output schema
- `mutable_layer`: system prompt, few-shot examples, formatting instructions
- `entrypoint`: prompt run over eval set
- `ledger`: prompt revision, score, failure notes, keep/discard status

## Example 3: Retrieval Or Ranking Task

User task:
Improve search relevance for these support articles.

Normalization:

- `objective`: improve ranking quality
- `primary_metric`: NDCG, recall@k, or judged relevance score
- `fixed_layer`: query set, labeled relevance judgments, serving constraints
- `mutable_layer`: ranking formula, filters, reranker prompt, chunking strategy
- `entrypoint`: offline eval script
- `ledger`: config ID, metric, latency, status, description

## Example 4: Data Pipeline Quality

User task:
Reduce failures in this ingestion pipeline without slowing it too much.

Normalization:

- `objective`: reduce bad records and failed runs
- `primary_metric`: failure rate or valid-record rate
- `secondary_costs`: runtime and operator complexity
- `fixed_layer`: input fixtures, acceptance checks, downstream contract
- `mutable_layer`: parsing rules, retries, validation thresholds, batching strategy
- `entrypoint`: pipeline run against stable fixtures
- `ledger`: run ID, quality metric, runtime, status, description
