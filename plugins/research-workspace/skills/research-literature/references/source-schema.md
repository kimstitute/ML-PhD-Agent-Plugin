# Source records

Example source JSON (paths relative to the research project):

```json
{
  "title": "Paper title",
  "url": "https://example.org/paper",
  "doi": "10.1234/example",
  "readLevel": "fulltext",
  "fulltext": ".research/agents/codex-literature-1/workspace/paper-snapshot.txt",
  "notes": ".research/agents/codex-literature-1/workspace/reading-note-v1.md",
  "locator": "Section 4.2, Table 3"
}
```

For abstract-only reading, use `"readLevel": "abstract"` and omit fulltext. It may motivate a proposed claim but cannot be promoted to supported through this CLI. A DOI is optional for arXiv-only papers. A local PDF is acceptable as the fulltext artifact only if it was actually read; a hash is provenance, not proof of reading.

Claim JSON:

```json
{
  "text": "A narrowly scoped statement with conditions and limitations",
  "evidence": [{ "kind": "source", "id": "source-returned-id", "locator": "Section 4.2, Table 3" }]
}
```

`claim add` starts at proposed. `claim review --id ID --status supported|partial|unsupported --reason TEXT` requires actor coordinator. Supported checks full-text registration and artifact integrity, but the reviewer must still judge entailment. Multiple weak citations do not add up to strong evidence.
