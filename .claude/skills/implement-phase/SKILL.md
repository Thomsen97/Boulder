---
name: implement-phase
description: Implement one phase from docs/PLAN.md end to end - plan, wait for approval, implement, test, open a PR and get it reviewed by the pr-reviewer subagent.
argument-hint: "[phase-number]"
disable-model-invocation: true
---

Implement phase $0 from `docs/PLAN.md`. Follow these steps in order. They apply for the rest of this session.

## 1. Prepare

1. Run `git status`. The working tree must be clean; if it is not, stop and ask Sebastian.
2. `git switch main` and `git pull`.
3. Read phase $0 in `docs/PLAN.md`: goal, spec references, dependencies, "Needs" and "Done when".
4. Check that every phase it depends on has status Done. If not, stop and say which one is missing.
5. For every item under "Needs", ask Sebastian to confirm it is in place when you cannot verify it without secrets. Never open `.env` files to check.
6. Read the SPEC sections and requirement IDs the phase lists, the parts of `docs/architecture.md` that apply, and the relevant ADRs. If the phase touches user content, also read SPEC section 5 and section 10.
7. Create the branch `phase/NN-short-slug` (NN zero-padded, e.g. `phase/07-groups-api`).

## 2. Plan, then wait

Present to Sebastian:
- the files you will create or change, in order;
- for each "Done when" item, how it will be proven (test name or manual device check);
- risks, open questions, and any ambiguity in the SPEC with your proposed interpretation;
- new dependencies and why they are needed.

Then **stop and wait for his OK**. Do not write code before it. If he changes the plan, follow the changed plan.

## 3. Implement

- When the phase has both UI and API work, do the UI first against the mock layer.
- Follow `CLAUDE.md` and `docs/architecture.md`.
- Commit in small Conventional Commits.
- After any API change, regenerate `api/openapi/v1.json` and the mobile types.
- Set the phase status in `docs/PLAN.md` to "In progress" in the first commit.

## 4. Verify

- Run all standard checks from `CLAUDE.md` and fix until they are green. Never skip, weaken or delete tests.
- For manual "Done when" items, write exact steps for Sebastian (what to do on which device, what to expect). Leave those boxes unchecked until he confirms.

## 5. Update the docs

- `docs/PLAN.md`: tick the boxes that are met, write Notes (deviations, pending manual checks, follow-ups), set status to "In review".
- If a decision changed: edit `docs/SPEC.md` or add an ADR in `docs/adr/` and update its index.
- If a command changed: update `CLAUDE.md`.

## 6. Open the pull request

1. `git push -u origin <branch>`.
2. Fill in `.github/pull_request_template.md`, write it to a temporary file outside the repository, and run `gh pr create --base main --title "Phase NN: <name>" --body-file <tmpfile>`.

## 7. Independent review

1. Delegate to the `pr-reviewer` subagent with exactly this prompt and nothing else: `Review PR #<number> for phase $0. Round 1.` Do not add a summary of your work; the review must be independent.
2. Read its result. Fix every blocking finding. If you disagree with one, reply on the PR with `gh pr comment` explaining why and leave it for Sebastian. Fix non-blocking findings that are cheap; list the rest as follow-ups in the phase Notes.
3. Push the fixes and run the reviewer once more with `Review PR #<number> for phase $0. Round 2.`
4. Stop after round 2 even if findings remain; they go to Sebastian.

## 8. Hand over

Report to Sebastian:
- the PR link and CI status (`gh pr checks <number>`);
- a summary of the standard check results (pass counts);
- the changed files, grouped by area;
- the review verdict and anything unresolved;
- the manual checks he must do before merging.

**Never merge the PR and never push to `main`.** Sebastian merges.
