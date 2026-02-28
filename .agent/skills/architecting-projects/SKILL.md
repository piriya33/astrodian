---
name: architecting-projects
description: Organizes the current folder into a structured Obsidian project vault with standard folders, a home note, and a visual dashboard. Use when the user asks to "setup a project," "organize this folder," or "create an Obsidian structure."
---

# Architecting Projects

This skill transforms any folder into a fully featured Obsidian project space. It is designed to work directly on the file system.

## Triggering Contexts

- When the user wants to start a new complex project (e.g., "Plan a course," "Write a book").
- When the user wants to organize an existing chaotic folder.
- When the user explicitly asks for "Obsidian setup" or "Project structure."

## Workflow Checklist

- [ ] detailed requirements gathered (project name, goal)
- [ ] folder structure created (`00_Meta`, `10_Research`, `20_Development`, `30_Output`, `99_Archive`)
- [ ] resource files copied (`Project_Home.md`, `Dashboard.canvas`)
- [ ] initial notes created or moved

## Instructions

### 1. Structure Scaffolding

When asking to "architect" or "setup" a project, ALWAYS enforce this folder, numbering system for easy sorting:

```
[ProjectRoot]/
  ├── 00_Meta/          # Templates, system files, project config
  ├── 10_Research/      # Inputs: sources, raw notes, literature
  ├── 20_Development/   # Throughputs: drafts, outlines, thinking
  ├── 30_Output/        # Outputs: final deliverables, polished content
  └── 99_Archive/       # Deprecated or finished items
```

**Action**: Use `run_command` to create these directories if they don't exist.

### 2. The "Project Home" (MOC)

Every project needs a single entry point.

1. Read the template from `.agent/skills/architecting-projects/resources/template-moc.md`.
2. Replace `{{date}}` with the current date.
3. Replace `{{project_name}}` with the folder name or user-provided name.
4. Replace `{{folder_path}}` with the relative path of the project root (for Dataview queries).
5. Write this file to `00_Meta/Project_Home.md`.

### 3. The Visual Dashboard (Canvas)

Obsidian Canvas is powerful for high-level thinking.

1. Read the template from `.agent/skills/architecting-projects/resources/project-dashboard.canvas`.
2. Write this file to the **root** of the project as `Dashboard.canvas`.
    - *Note*: Creating it at the root makes it the first thing seen when opening the folder in some views.

### 4. Handling Existing Files

If the folder is NOT empty:

1. Ask the user if they want to move existing files into the new structure (likely into `10_Research` or `20_Development`).
2. Do NOT delete any user files.

## Artifact Integration

- **task.md**: Update the task list to reflect the "Project Setup" phase.
- **walkthrough.md**: After setting up, create a walkthrough showing the new structure and links to the generated files.

## Files & Resources

- `resources/template-moc.md`: Template for the Home note.
- `resources/project-dashboard.canvas`: Template for the Canvas dashboard.
