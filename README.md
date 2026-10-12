<p align="center">
  <img src="plugins/research-workspace/assets/logo.png" alt="ML PhD Agent — research notebook, neural network and discovery star" width="180" />
</p>

# ML-PhD-Agent-Plugin

**A research coworker for Codex and Claude Code. Your model, your tools, your project's memory.**

Ask questions, investigate literature, implement research code, plan experiments, analyze results, and draft or review a paper—without losing research context between sessions or hosts.

Built for machine-learning research, with computer-vision-oriented guidance. State lives in each project's `.research/` workspace, not a separate database or cloud service. Requires **Node.js 20+**; the runtime has **zero external dependencies**.

## What it does

- **Research conversation:** discuss methods, stress-test hypotheses, and propose the next useful step.
- **Literature work:** search and screen papers with your host's tools, record reading depth and precise evidence locations, and organize related work.
- **Research engineering:** translate a method into an implementation plan, build baselines, and check configs, data splits, leakage, seeds, ablations, and reproducibility.
- **Experiment bookkeeping:** preserve planned budgets, actual job identifiers, measured results, raw artifacts, and negative outcomes.
- **Evidence-based analysis:** compare matched-seed results, inspect failure slices, and distinguish observed facts from interpretations and untested hypotheses.
- **Writing and review:** connect manuscript claims and numbers to evidence, draft sections, and review scientific adequacy rather than just grammar.
- **Persistent collaboration:** keep agent-specific workspaces, shared tasks, acceptance decisions, and handoffs across Codex and Claude Code.

This is a workflow and memory layer, not a new model or an autonomous GPU scheduler. Research code is written by your host agent; available search, terminal, SSH, and model tools come from that host. No separate model API key is required by this plugin.

## Install

The plugin identifier is `research-workspace`; its display name is **ML PhD Agent**.

### Claude Code

Run inside Claude Code:

```text
/plugin marketplace add kimstitute/ML-PhD-Agent-Plugin
/plugin install research-workspace@ml-phd-agent
```

Choose the installation scope you want. For a local checkout without installing:

```sh
git clone https://github.com/kimstitute/ML-PhD-Agent-Plugin.git
claude --plugin-dir ./ML-PhD-Agent-Plugin/plugins/research-workspace
```

Seven shared skills are available as namespaced commands, for example `/research-workspace:research-experiment` and `/research-workspace:research-review`. Five specialist agent definitions are also provided for Claude Code; delegation remains subject to your instructions and host permissions.

### Codex

With a plugin-enabled Codex CLI:

```sh
codex plugin marketplace add kimstitute/ML-PhD-Agent-Plugin
codex plugin add research-workspace@ml-phd-agent
```

In a compatible Codex desktop version, manage installation and enablement in **Plugins**. Session hooks can require separate trust approval. Host capabilities differ: Claude agent definitions are not automatically registered as Codex subagents.

The package uses the supported compatibility manifests. See the official [Codex packaging guide](https://developers.openai.com/plugins/build/plugins) and [Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference) for host-specific setup.

### Initialize a research project

Open the project and ask:

> Initialize this project's research workspace. Our question is whether the proposed representation improves reconstruction quality at the same compute budget. Record constraints and suggest a baseline-first plan. Do not launch training yet.

Or use the CLI directly, replacing the two paths below:

```sh
node /path/to/ML-PhD-Agent-Plugin/plugins/research-workspace/scripts/research.mjs --project /path/to/my-research init --topic "A falsifiable computer-vision research question"
```

From the initialized research project:

```sh
node .research/research.mjs context
node .research/research.mjs help
node .research/research.mjs doctor
```

Initialization preserves existing `AGENTS.md` and `CLAUDE.md` content and adds a managed research block. Reinitializing reconnects the plugin path without clearing your records or changing your established topic. Global host settings are not edited by this command.

## Talk to it like a research coworker

English and Korean are both fine; the agent follows your language.

> 관련 논문을 조사하고 실제로 읽은 범위를 표시해줘. 우리 가설과 가장 가까운 방법, 차이점, 확인해야 할 근거를 정리해줘.

> 논문의 핵심 모듈을 현재 코드베이스에 구현해줘. 먼저 대응 관계와 최소 테스트를 제안하고, 학습은 실행하지 마.

> baseline과 후보 방법의 결과를 같은 seed끼리 비교해줘. 평균 향상만 보지 말고 실패 사례와 불확실성도 분석해줘.

> 지금까지의 실험으로 주장할 수 있는 범위를 정리하고, 논문 초안에서 근거 없는 표현을 표시해줘.

> 이전 세션의 연구 상태를 읽고 이어서 작업해줘. 다른 에이전트의 미완성 초안은 확정된 사실로 취급하지 마.

## Shared skills

| Skill | Focus |
| --- | --- |
| `research` | Conversational routing, project context, and collaboration |
| `research-setup` | Project initialization and resuming work |
| `research-literature` | Search, screening, source notes, and evidence locations |
| `research-experiment` | Baselines, implementation, budgets, and run records |
| `research-analysis` | Comparisons, failure analysis, and claim assessment |
| `research-writing` | Evidence-linked manuscript drafting |
| `research-review` | Scientific review and reproducibility checks |

## Project-local memory

```text
your-research-project/
├── AGENTS.md / CLAUDE.md      # Host guidance, preserving existing content
└── .research/
    ├── PROJECT.md            # Compact context index
    ├── state.json            # Readable current-state projection
    ├── events/               # Atomic, snapshot-bearing event journal
    ├── agents/<actor>/
    │   ├── workspace/        # Reports, drafts, and working artifacts
    │   └── notes.md          # Provisional notes
    └── research.mjs          # Project CLI linked to your plugin installation
```

Use distinct actor names such as `codex-experiment-1` and `claude-literature-1`. Owners submit task reports; the coordinator accepts or requests revision. Actor names are cooperation rules, not OS security boundaries. Switching hosts retains the same files, not the previous host's conversation or credentials.

State changes use a shared lock and atomic journal. Interrupted projection writes can be recovered from the committed journal; corrupted journals and manual snapshot edits are reported rather than silently ignored. Reports and run artifacts are hash-checked. After an error, inspect `status` before retrying: the journal may already have committed the change.

Do not manually edit the journal or `state.json`. A leftover lock requires checking its owner and live process before manual recovery. This protocol targets cooperating processes on a local filesystem, not hostile concurrent writers or shared NFS.

### Task and handoff example

Run these from an initialized project. Replace returned IDs and create the report file before submitting it.

```sh
node .research/research.mjs task add --title "Implement baseline and smoke test" --owner codex-experiment-1
node .research/research.mjs --actor codex-experiment-1 task start --id "<task-id>"
node .research/research.mjs --actor codex-experiment-1 task submit --id "<task-id>" --report ".research/agents/codex-experiment-1/workspace/report.md"
node .research/research.mjs --actor coordinator task accept --id "<task-id>" --reason "Checked implementation and report"
node .research/research.mjs --actor codex-experiment-1 handoff add --summary "Baseline implemented; training not launched" --next "Agree on compute budget and validation protocol"
```

Experiment inputs are documented in [run-schema.md](plugins/research-workspace/skills/research-experiment/references/run-schema.md). Source and claim inputs are in [source-schema.md](plugins/research-workspace/skills/research-literature/references/source-schema.md). Spec files are read relative to the calling directory; artifact paths inside them are relative to the research project.

## Analysis utilities

Dependency-free tools are also usable outside a conversation:

```sh
node /path/to/plugin/scripts/compare.mjs --input paired-results.json
node /path/to/plugin/scripts/citations.mjs --input manuscript.md
```

- **Seed comparison:** exactly matched seeds, mean, sample standard deviation, and a deterministic paired-bootstrap interval. See the [input format and interpretation](plugins/research-workspace/skills/research-analysis/references/comparison.md). Small-sample results are exploratory; seed variation is not test-sample uncertainty.
- **DOI checks:** identifier resolution and Crossref metadata, with network uncertainty kept separate from missing identifiers. DOI existence does **not** establish that a citation supports a claim. These checks send DOI identifiers to public DOI/Crossref services.
- **Research templates:** [experiment plan](plugins/research-workspace/templates/experiment-plan.md), [result report](plugins/research-workspace/templates/result-report.md), [negative result](plugins/research-workspace/templates/negative-result.md), and [reproducibility checklist](plugins/research-workspace/templates/reproducibility-checklist.md).

## Boundaries and research safety

`run plan/start/finish` records work; it does not launch, schedule, or monitor GPU jobs. Your host agent executes only authorized commands and records actual job IDs and raw evidence. Automatic remote-job monitoring, budget enforcement, and recovery/relaunch of training are not implemented.

The plugin asks agents to preserve failed experiments, isolate test data, avoid fabricated citations and numbers, and distinguish evidence from hypotheses. These instructions are not guarantees of scientific validity. `doctor` checks bookkeeping and file integrity, not novelty, leakage-free evaluation, or correctness of conclusions. A recorded approval string is not a substitute for your authorization.

Research records stay in the project's files, but your selected host/model may process the context it reads. Configure that host's privacy policy and permissions accordingly. Decide separately whether to commit `.research/` to your research repository; keep credentials, private papers, sensitive notes, datasets, and checkpoints out of public Git history.

## Development and verification

```sh
npm run check
claude plugin validate ./plugins/research-workspace
```

No dependency install is needed. The automated suite covers task transitions, run/source/claim records, handoffs, artifact hashes, locks, journal recovery, path safety, mocked DOI responses, and paired-seed comparisons. CI runs Node checks on Windows and Linux. Real model-driven workflows and GPU/SSH experiments still need a separate pilot in your research environment.

Version: **0.1.0**. License: [MIT](LICENSE). Required legal notices are maintained in [THIRD_PARTY_NOTICES.md](plugins/research-workspace/THIRD_PARTY_NOTICES.md) and the plugin's `licenses/` directory.
