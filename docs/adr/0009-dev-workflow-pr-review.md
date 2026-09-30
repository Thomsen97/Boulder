# ADR-0009: Branch per phase, PR, AI review subagent, human merge

**Status:** Accepted (2026-09-30)

## Context
Claude Code implements the phases. Sebastian wants automatic PRs and an independent review by a senior-level reviewer before merging. The repository is public, so branch protection is available on the free plan. GitHub does not allow approving your own PR, and Claude Code acts with Sebastian's GitHub account.

## Decision
- `/implement-phase N` creates branch `phase/NN-slug`, implements after Sebastian approves the plan, runs all checks, updates PLAN.md, pushes and opens a PR.
- The `pr-reviewer` subagent (Opus) starts with fresh context and gets only the PR number and phase. It reads SPEC, PLAN, architecture and ADRs itself, runs the checks and posts its findings as a PR comment (blocking / non-blocking). It cannot edit files.
- The implementer fixes blocking findings; at most two review rounds, then the rest is left to Sebastian.
- **Sebastian merges** after CI is green. Claude never merges or pushes to `main` (denied in `.claude/settings.json`, enforced by branch protection).

## Alternatives considered
- **Auto-merge when CI and reviewer pass:** faster, but the same model family writes and reviews the code, so they share blind spots, and Sebastian needs to know the code for interviews.
- **Review as a GitHub Action:** runs on every push, but uses Actions minutes and a separate credential; the local subagent can also run the full test suite.

## Consequences
- Each phase needs a short human step (skim PR and review, click merge).
- Review comments are kept in the PR history, which also documents the project for employers.
