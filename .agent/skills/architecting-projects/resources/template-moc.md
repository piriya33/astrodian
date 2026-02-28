---
tags: [project/root, status/active]
created: {{date}}
---

# 🏠 Project Home: {{project_name}}

> [!INFO] Project Overview
> **Goal**: [Describe the main goal of this project]
> **Status**: `Active`
> **Deadline**: [YYYY-MM-DD]

## 📂 Navigation

- [[00_Meta]] - Project settings, templates, tags
- [[10_Research]] - Raw notes, articles, sources
- [[20_Development]] - Drafts, outlines, work-in-progress
- [[30_Output]] - Final deliverables
- [[99_Archive]] - Old content

## 📋 Active Tasks

 (Queries tasks from files in this folder)

```dataview
TASK
FROM "{{folder_path}}"
WHERE !completed
GROUP BY file.link
```

## 🧠 Recent Notes

```dataview
LIST
FROM "{{folder_path}}"
SORT file.mtime DESC
LIMIT 5
```

## 🔗 Quick Links

- [[Dashboard.canvas|Visual Dashboard]]
