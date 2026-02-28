---
name: executing-plans
description: Guides the agent through the systematic execution of an implementation plan. Use when the user asks to "start working" on a plan or "execute the plan".
---

# Executing Plans

## Triggering Contexts

- User says "Go ahead", "Start", or "Execute the plan".
- An `implementation_plan.md` has been approved.
- The agent needs to switch from PLANNING to EXECUTION mode.

## Workflow Checklist

Copy this into your `task.md` (or update existing):

- [ ] **Mode Switch**: Call `task_boundary` with `Mode: EXECUTION`.
- [ ] **Step-by-Step Execution**: Follow the `implementation_plan.md` exactly.
- [ ] **Test-Driven Loop**: For each change:
    1. Create/Update test (if applicable).
    2. Implement change.
    3. Verify pass.
- [ ] **Progress Tracking**: accurate `task.md` updates after each major step.
- [ ] **Verification**: Run the final verification steps from the plan.

## Instructions

### 1. The Execution Mindset

- **One Step at a Time**: Do not batch too many tool calls. One or two file edits per turn.
- **Verify Often**: After writing a file, read it back or run a syntax check if possible.
- **Stick to the Plan**: If you need to deviate, stop and `notify_user`.

### 2. Handling Errors

- If a step fails, do NOT blindly retry.
- Pause, analyze the error, and check `systematic-debugging` if stuck.

### 3. Completion

- When all steps are done, switch to `VERIFICATION` mode.
- Generate a `walkthrough.md` to show your work.
