# Collaboration & Review Workflow for This Project

This document describes how I (the assistant) approach work on this project and how you can best help with review and validation.

## 1. Before Coding

- I restate the goal in my own words to ensure alignment.
- I maintain a clear checklist or plan (e.g., `IMPROVEMENT_PLAN.md`) so we both know what “done” means.
- I confirm priorities and constraints with you when they are ambiguous.

## 2. While Coding

- I work in small, focused changes so it is easy to track and reason about diffs.
- I keep changes consistent with the existing style and structure of the project.
- I re‑read my own changes (self‑review) before presenting them to you.

## 3. Technical Validation

- When possible, I describe or run relevant commands/tests (e.g., `npm run dev`, `npm test`) to catch obvious breakage.
- If I cannot run something in this environment, I will:
  - Clearly state what should be run (exact commands).
  - Describe what you should expect to see if things are working.

## 4. Behavioral & UX Checks

- I mentally walk through the main user flows, for example:
  - Select file → Upload → See it in the list → Download/Delete → Refresh.
- I consider success paths, error paths, and common edge cases.
- I check that UI states (loading, success, error, empty) are handled coherently.

## 5. Final Recap of Changes

- I summarize:
  - What changed (high‑level).
  - Where it changed (file paths, key components).
  - Any known limitations or follow‑ups.
- I keep the summary concise so you can review quickly.

## 6. How You Can Help Best

- Confirm whether the plan and behavior match your intent (e.g., priorities in `IMPROVEMENT_PLAN.md`).
- Run the app on your real devices (phone/tablet/desktop) to validate the experience.
- Tell me if anything looks or feels off (layout, colors, wording, interactions).
- Highlight your preferences for visual style or UX, so I can adapt the implementation to your taste.

You do not need to micro‑check every line of code. I aim to provide changes that are internally consistent and testable; your main role is to ensure the result matches your goals and feels right in real use.

