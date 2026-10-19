You are the **Standards** reviewer in a two-axis code review. Repo: C:\Users\Advan\.ab\chatbot (the current directory).

Review the uncommitted work-in-progress diff: run `git diff HEAD` (HEAD = 2b0a6a3). The commit list for context: the working tree contains changes for ticket 10. Also run `git status --short` to see untracked files (tests/korpus/topik-gap.json, tests/conversation/topikGapHandoff.test.ts, and .scratch/tmp probe files which are scratch).

Standards sources in this repo — read them and check the diff against them:
- `AGENTS.md`
- `CONTEXT.md`
- `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`
- `docs/adr/0001` through `docs/adr/0010` (especially ADR-0009, ADR-0005, ADR-0010, ADR-0004)
- `README.md` (testing and structure conventions)
- `src/conversation/types.ts` seam documentation and module header comments
- `tests/korpus/README.md` (corpus format conventions)
There is no CODING_STANDARDS.md or CONTRIBUTING.md.

On top of the repo docs, carry this fixed smell baseline (Fowler, Refactoring ch.3). A documented repo standard always overrides the baseline; each smell is a labelled judgement call ("possible Feature Envy"), never a hard violation. Skip anything tooling enforces:
- Mysterious Name: name doesn't reveal what it does/holds → rename.
- Duplicated Code: same logic shape in more than one hunk/file → extract shared shape.
- Feature Envy: method reaches into another object's data more than its own → move method.
- Data Clumps: same fields/params travel together → bundle into a type.
- Primitive Obsession: primitive/string standing in for a domain concept → give it a type.
- Repeated Switches: same switch/if-cascade on same type recurs → polymorphism or shared map.
- Shotgun Surgery: one logical change forces scattered edits across files → gather into one module.
- Divergent Change: one file edited for several unrelated reasons → split by reason.
- Speculative Generality: abstraction/params/hooks for needs the spec doesn't have → delete.
- Message Chains: long a.b().c().d() navigation → hide behind one method.
- Middle Man: class/function that mostly delegates → cut it.
- Refused Bequest: subclass ignores/overrides most of what it inherits → composition.

Report, per file/hunk where relevant: (a) every place the diff violates a documented standard — cite the standard (file + the rule); and (b) any baseline smell you spot — name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words. Do not modify any file.
