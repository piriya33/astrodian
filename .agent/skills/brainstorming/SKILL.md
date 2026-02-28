---
name: brainstorming-ideas
description: Explores user intent, requirements, and design before implementation. Use before creating features, building components, or modifying behavior.
---

# Brainstorming Ideas Into Designs

## Triggering Contexts
- When the user has a vague idea or request.
- Before starting any new feature implementation.
- When requirements are unclear or need refinement.
- When the user asks to "brainstorm" or "discuss" a solution.

## Workflow Checklist
(Copy this into `task.md` when starting a brainstorming session)

- [ ] Analyze current project context (files, docs, recent commits)
- [ ] Requirements gathering (Ask questions one at a time)
- [ ] Propose 2-3 approaches with trade-offs
- [ ] Select best approach with user
- [ ] Draft design in sections (200-300 words)
- [ ] Validate each section with user
- [ ] Finalize design document in `design_docs/` or `implementation_plan.md`

## Instructions

### 1. Understanding the Idea
- **Context First**: Check `task.md`, existing code, and documentation before asking.
- **One Question Rule**: Ask only one question per message to avoid overwhelming responsiveness.
- **Multiple Choice**: Propose options (A, B, C) when possible to make it easy for the user to decide.
- **Focus**: Nail down the purpose, constraints, and success criteria.

### 2. Exploring Approaches
- Always propose **2-3 distinct approaches**.
- List trade-offs (Pros/Cons) for each.
- Lead with your recommended option and explain why.

### 3. Presenting the Design
- **Incremental Validation**: Do not dump a huge design doc at once. Present it in chunks (Architecture, Data Flow, UI, etc.).
- **Check-ins**: After each chunk, ask: "Does this look right so far?"
- **YAGNI**: Ruthlessly cut unnecessary complexity.

## Artifact Integration

### `implementation_plan.md`
- Once the brainstorming is complete and an approach is selected, creating an `implementation_plan.md` is the natural next step.
- The outcome of this skill should be a verified design that is ready to be formalized.

### `generate_image` (Antigravity Specific)
- If the brainstorming involves UI/UX, use `generate_image` to create mockups of the proposed design options.
- Use `browser_subagent` to verify if the design fits within existing layouts.
